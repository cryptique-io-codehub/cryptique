const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class RedundancyDetector {
  constructor() {
    this.ignorePatterns = ['node_modules', '.git', 'build', 'dist', 'coverage'];
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];
  }

  async identifyEmptyFiles(rootPath) {
    const results = {
      emptyFiles: [],
      emptyDirectories: [],
      nearlyEmptyFiles: [],
      summary: { totalEmptyFiles: 0, totalEmptyDirectories: 0, totalNearlyEmptyFiles: 0, potentialSavings: 0 }
    };

    await this._scanForEmptyItems(rootPath, results);
    
    results.summary.totalEmptyFiles = results.emptyFiles.length;
    results.summary.totalEmptyDirectories = results.emptyDirectories.length;
    results.summary.totalNearlyEmptyFiles = results.nearlyEmptyFiles.length;
    results.summary.potentialSavings = results.emptyFiles.reduce((sum, file) => sum + file.size, 0);

    return results;
  }

  async detectDuplicateFiles(rootPath, similarityThreshold = 0.9) {
    const results = {
      identicalFiles: [],
      similarFiles: [],
      summary: { totalIdenticalGroups: 0, totalSimilarGroups: 0, potentialSavings: 0 }
    };

    const fileHashes = new Map();
    const fileContents = new Map();
    
    await this._scanForDuplicates(rootPath, fileHashes, fileContents);
    
    const hashGroups = new Map();
    for (const [filePath, hash] of fileHashes) {
      if (!hashGroups.has(hash)) hashGroups.set(hash, []);
      hashGroups.get(hash).push(filePath);
    }

    for (const [hash, files] of hashGroups) {
      if (files.length > 1) {
        const fileStats = await Promise.all(files.map(async (filePath) => {
          const stats = await stat(filePath);
          return {
            path: filePath,
            relativePath: path.relative(rootPath, filePath),
            size: stats.size,
            lastModified: stats.mtime
          };
        }));

        results.identicalFiles.push({
          hash, files: fileStats, count: files.length,
          duplicateSize: fileStats[0].size * (files.length - 1)
        });
      }
    }

    results.summary.totalIdenticalGroups = results.identicalFiles.length;
    results.summary.potentialSavings = results.identicalFiles.reduce((sum, group) => sum + group.duplicateSize, 0);

    return results;
  }

  generateRemovalRecommendations(emptyFilesResult, duplicateFilesResult, usageMap = []) {
    const recommendations = {
      safeToRemove: [], requiresReview: [], keepFiles: [],
      summary: { totalRecommendations: 0, safeRemovals: 0, reviewRequired: 0, estimatedSavings: 0 }
    };

    const usageLookup = new Map();
    usageMap.forEach(file => usageLookup.set(file.path, file));

    emptyFilesResult.emptyFiles.forEach(file => {
      const usage = usageLookup.get(file.path);
      const recommendation = {
        type: 'empty-file', path: file.path, relativePath: file.relativePath,
        reason: 'File is completely empty', size: file.size,
        isReferenced: usage ? usage.isReferenced : false,
        importCount: usage ? usage.importCount : 0
      };

      if (!recommendation.isReferenced && recommendation.importCount === 0) {
        recommendation.safety = 'safe';
        recommendations.safeToRemove.push(recommendation);
      } else {
        recommendation.safety = 'review';
        recommendation.reviewReason = 'File is empty but may be referenced';
        recommendations.requiresReview.push(recommendation);
      }
    });

    recommendations.summary.totalRecommendations = recommendations.safeToRemove.length + recommendations.requiresReview.length;
    recommendations.summary.safeRemovals = recommendations.safeToRemove.length;
    recommendations.summary.reviewRequired = recommendations.requiresReview.length;
    recommendations.summary.estimatedSavings = recommendations.safeToRemove.reduce((sum, rec) => sum + rec.size, 0);

    return recommendations;
  }
  
  async _scanForEmptyItems(dirPath, results) {
    try {
      const items = await readdir(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        if (this.ignorePatterns.some(pattern => fullPath.includes(pattern))) continue;

        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await this._scanForEmptyItems(fullPath, results);
          try {
            const dirItems = await readdir(fullPath);
            if (dirItems.length === 0) {
              results.emptyDirectories.push({
                path: fullPath,
                relativePath: path.relative(process.cwd(), fullPath),
                lastModified: stats.mtime
              });
            }
          } catch (error) {}
        } else if (stats.isFile()) {
          const ext = path.extname(item);
          if (this.supportedExtensions.includes(ext)) {
            const isEmpty = await this._isFileEmpty(fullPath);
            if (isEmpty) {
              results.emptyFiles.push({
                path: fullPath,
                relativePath: path.relative(process.cwd(), fullPath),
                size: stats.size,
                lastModified: stats.mtime,
                extension: ext
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
  }

  async _scanForDuplicates(dirPath, fileHashes, fileContents) {
    try {
      const items = await readdir(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        if (this.ignorePatterns.some(pattern => fullPath.includes(pattern))) continue;

        const stats = await stat(fullPath);
        if (stats.isDirectory()) {
          await this._scanForDuplicates(fullPath, fileHashes, fileContents);
        } else if (stats.isFile()) {
          const ext = path.extname(item);
          if (this.supportedExtensions.includes(ext) && stats.size > 0) {
            try {
              const content = await readFile(fullPath, 'utf8');
              const hash = crypto.createHash('md5').update(content).digest('hex');
              fileHashes.set(fullPath, hash);
              fileContents.set(fullPath, content);
            } catch (error) {
              console.warn(`Could not read file ${fullPath}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
    }
  }

  async _isFileEmpty(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      return content.trim().length === 0;
    } catch (error) {
      return false;
    }
  }

  async runCompleteAnalysis(rootPath, usageMap = []) {
    console.log('Running redundancy analysis...');
    
    console.log('1. Identifying empty files...');
    const emptyFilesResult = await this.identifyEmptyFiles(rootPath);
    
    console.log('2. Detecting duplicate files...');
    const duplicateFilesResult = await this.detectDuplicateFiles(rootPath);
    
    console.log('3. Generating removal recommendations...');
    const recommendations = this.generateRemovalRecommendations(emptyFilesResult, duplicateFilesResult, usageMap);

    return {
      emptyFiles: emptyFilesResult,
      duplicateFiles: duplicateFilesResult,
      recommendations,
      summary: {
        totalEmptyFiles: emptyFilesResult.summary.totalEmptyFiles,
        totalEmptyDirectories: emptyFilesResult.summary.totalEmptyDirectories,
        totalNearlyEmptyFiles: emptyFilesResult.summary.totalNearlyEmptyFiles,
        totalIdenticalGroups: duplicateFilesResult.summary.totalIdenticalGroups,
        totalSimilarGroups: duplicateFilesResult.summary.totalSimilarGroups,
        safeRemovals: recommendations.summary.safeRemovals,
        reviewRequired: recommendations.summary.reviewRequired,
        estimatedSavings: recommendations.summary.estimatedSavings
      }
    };
  }
}

module.exports = RedundancyDetector;
