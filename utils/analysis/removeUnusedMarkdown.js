/**
 * Remove Unused Markdown Files Script
 * Safely removes unused markdown files and fixes broken references
 * Implements requirements 1.5 and 5.2 from the codebase cleanup specification
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const MarkdownAnalyzer = require('./markdownAnalyzer');

const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class UnusedMarkdownRemover {
  constructor() {
    this.analyzer = new MarkdownAnalyzer();
    this.removedFiles = [];
    this.fixedReferences = [];
    this.errors = [];
    this.dryRun = false;
  }

  /**
   * Remove unused markdown files and fix broken references
   * @param {Object} options - Removal options
   * @returns {Promise<Object>} Removal results
   */
  async removeUnusedMarkdown(options = {}) {
    this.dryRun = options.dryRun || false;
    const rootPath = options.rootPath || process.cwd();
    
    console.log(`📝 ${this.dryRun ? 'DRY RUN: ' : ''}Starting markdown cleanup...`);
    
    // Step 1: Find all markdown files
    console.log('🔍 Finding markdown files...');
    const markdownFiles = await this.findMarkdownFiles(rootPath);
    console.log(`📋 Found ${markdownFiles.length} markdown files`);

    if (markdownFiles.length === 0) {
      console.log('✅ No markdown files found');
      return this.generateReport();
    }

    // Step 2: Analyze markdown files
    console.log('🔍 Analyzing markdown files...');
    const analysis = await this.analyzer.analyzeMarkdownFiles(markdownFiles, rootPath);
    
    console.log(`📊 Analysis complete:`);
    console.log(`  - Total files: ${analysis.summary.totalFiles}`);
    console.log(`  - Empty files: ${analysis.summary.emptyFiles}`);
    console.log(`  - Unused files: ${analysis.summary.unusedFiles}`);
    console.log(`  - Broken links: ${analysis.summary.brokenLinks}`);

    // Step 3: Create backup if not dry run
    if (!this.dryRun && (analysis.issues.unused.length > 0 || analysis.issues.broken.length > 0)) {
      await this.createBackup(analysis.issues.unused, analysis.issues.broken);
    }

    // Step 4: Remove unused files
    if (analysis.issues.unused.length > 0) {
      console.log(`🗑️ ${this.dryRun ? 'Would remove' : 'Removing'} ${analysis.issues.unused.length} unused files...`);
      
      for (const unusedFile of analysis.issues.unused) {
        await this.removeMarkdownFile(unusedFile);
      }
    }

    // Step 5: Fix broken references (remove broken links)
    if (analysis.issues.broken.length > 0) {
      console.log(`🔧 ${this.dryRun ? 'Would fix' : 'Fixing'} ${analysis.issues.broken.length} broken references...`);
      
      await this.fixBrokenReferences(analysis.issues.broken);
    }

    // Step 6: Generate report
    const report = this.generateReport();
    
    console.log(`✅ ${this.dryRun ? 'Dry run' : 'Cleanup'} completed!`);
    console.log(`📊 Files ${this.dryRun ? 'would be' : ''} removed: ${this.removedFiles.length}`);
    console.log(`🔧 References ${this.dryRun ? 'would be' : ''} fixed: ${this.fixedReferences.length}`);
    
    if (this.errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${this.errors.length}`);
    }

    return report;
  }

  /**
   * Find all markdown files in the codebase
   * @param {string} rootPath - Root path to search
   * @returns {Promise<Array>} Array of markdown files
   */
  async findMarkdownFiles(rootPath) {
    const markdownFiles = [];
    const ignorePatterns = [
      'node_modules',
      '.git',
      'build',
      'dist',
      'coverage',
      '.next',
      '.vercel',
      'logs',
      '.nyc_output',
      'tmp',
      'temp'
    ];

    const scanDirectory = async (dirPath) => {
      try {
        const items = await readdir(dirPath);
        
        for (const item of items) {
          const fullPath = path.join(dirPath, item);
          const relativePath = path.relative(rootPath, fullPath);
          
          // Skip ignored patterns
          if (ignorePatterns.some(pattern => relativePath.includes(pattern))) {
            continue;
          }
          
          const stats = await stat(fullPath);
          
          if (stats.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (stats.isFile() && path.extname(item).toLowerCase() === '.md') {
            markdownFiles.push({
              path: fullPath,
              relativePath: relativePath,
              name: item,
              size: stats.size,
              lastModified: stats.mtime
            });
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
      }
    };

    await scanDirectory(rootPath);
    return markdownFiles;
  }

  /**
   * Create backup of files before modification
   * @param {Array} filesToRemove - Files to remove
   * @param {Array} brokenLinks - Files with broken links to fix
   */
  async createBackup(filesToRemove, brokenLinks) {
    const backupDir = path.join('utils', 'analysis', 'backups', `markdown-cleanup-${Date.now()}`);
    
    try {
      await fs.promises.mkdir(backupDir, { recursive: true });
      console.log(`💾 Creating backup in ${backupDir}...`);

      // Backup files to be removed
      for (const file of filesToRemove) {
        try {
          const backupPath = path.join(backupDir, 'removed', path.relative(process.cwd(), file.path));
          const backupDirPath = path.dirname(backupPath);
          
          await fs.promises.mkdir(backupDirPath, { recursive: true });
          await fs.promises.copyFile(file.path, backupPath);
        } catch (error) {
          console.warn(`Warning: Could not backup ${file.path}: ${error.message}`);
        }
      }

      // Backup files with broken links that will be modified
      const filesToModify = new Set();
      brokenLinks.forEach(broken => {
        filesToModify.add(broken.file);
      });

      for (const filePath of filesToModify) {
        try {
          const backupPath = path.join(backupDir, 'modified', path.relative(process.cwd(), filePath));
          const backupDirPath = path.dirname(backupPath);
          
          await fs.promises.mkdir(backupDirPath, { recursive: true });
          await fs.promises.copyFile(filePath, backupPath);
        } catch (error) {
          console.warn(`Warning: Could not backup ${filePath}: ${error.message}`);
        }
      }

      // Create backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        filesToRemove: filesToRemove.length,
        filesToModify: filesToModify.size,
        brokenLinks: brokenLinks.length,
        files: {
          removed: filesToRemove.map(f => ({
            path: path.relative(process.cwd(), f.path),
            reason: f.reason,
            size: f.size
          })),
          modified: Array.from(filesToModify).map(f => ({
            path: path.relative(process.cwd(), f),
            reason: 'broken_links_fixed'
          }))
        }
      };

      await fs.promises.writeFile(
        path.join(backupDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      console.log(`✅ Backup created successfully`);
    } catch (error) {
      console.error(`❌ Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a single markdown file
   * @param {Object} file - File to remove
   */
  async removeMarkdownFile(file) {
    try {
      if (this.dryRun) {
        console.log(`  [DRY RUN] Would remove: ${file.path} (${file.reason})`);
        this.removedFiles.push({
          path: file.path,
          reason: file.reason,
          size: file.size,
          status: 'would-remove'
        });
      } else {
        await unlink(file.path);
        console.log(`  ✅ Removed: ${path.relative(process.cwd(), file.path)} (${file.reason})`);
        this.removedFiles.push({
          path: file.path,
          reason: file.reason,
          size: file.size,
          status: 'removed'
        });
      }
    } catch (error) {
      const errorInfo = {
        path: file.path,
        error: error.message,
        code: error.code
      };
      
      this.errors.push(errorInfo);
      console.error(`  ❌ Failed to remove ${file.path}: ${error.message}`);
    }
  }

  /**
   * Fix broken references by removing or commenting them out
   * @param {Array} brokenLinks - Array of broken link objects
   */
  async fixBrokenReferences(brokenLinks) {
    // Group broken links by file
    const fileGroups = new Map();
    brokenLinks.forEach(broken => {
      if (!fileGroups.has(broken.file)) {
        fileGroups.set(broken.file, []);
      }
      fileGroups.get(broken.file).push(broken);
    });

    // Process each file
    for (const [filePath, brokenLinksInFile] of fileGroups) {
      await this.fixBrokenLinksInFile(filePath, brokenLinksInFile);
    }
  }

  /**
   * Fix broken links in a single file
   * @param {string} filePath - Path to the file
   * @param {Array} brokenLinks - Broken links in this file
   */
  async fixBrokenLinksInFile(filePath, brokenLinks) {
    try {
      const content = await readFile(filePath, 'utf8');
      let modifiedContent = content;
      let modificationsCount = 0;

      // Sort broken links by line number (descending) to avoid index issues
      const sortedLinks = brokenLinks.sort((a, b) => {
        const lineA = (a.link && a.link.line) || (a.reference && a.reference.line) || 0;
        const lineB = (b.link && b.link.line) || (b.reference && b.reference.line) || 0;
        return lineB - lineA;
      });

      for (const broken of sortedLinks) {
        const link = broken.link || broken.reference;
        if (!link) continue;

        // Different strategies based on link type
        if (broken.link) {
          // Handle markdown/HTML links
          const linkPattern = this.createLinkPattern(broken.link);
          if (linkPattern && modifiedContent.includes(linkPattern)) {
            // Comment out the broken link instead of removing it
            const commentedLink = `<!-- BROKEN LINK: ${linkPattern} -->`;
            modifiedContent = modifiedContent.replace(linkPattern, commentedLink);
            modificationsCount++;
          }
        } else if (broken.reference) {
          // Handle file references
          const refPattern = this.createReferencePattern(broken.reference);
          if (refPattern && modifiedContent.includes(refPattern)) {
            // Comment out the broken reference
            const commentedRef = `<!-- BROKEN REFERENCE: ${refPattern} -->`;
            modifiedContent = modifiedContent.replace(refPattern, commentedRef);
            modificationsCount++;
          }
        }
      }

      if (modificationsCount > 0) {
        if (this.dryRun) {
          console.log(`  [DRY RUN] Would fix ${modificationsCount} broken links in: ${path.relative(process.cwd(), filePath)}`);
          this.fixedReferences.push({
            file: filePath,
            fixCount: modificationsCount,
            status: 'would-fix'
          });
        } else {
          await writeFile(filePath, modifiedContent, 'utf8');
          console.log(`  ✅ Fixed ${modificationsCount} broken links in: ${path.relative(process.cwd(), filePath)}`);
          this.fixedReferences.push({
            file: filePath,
            fixCount: modificationsCount,
            status: 'fixed'
          });
        }
      }
    } catch (error) {
      const errorInfo = {
        file: filePath,
        error: error.message,
        code: error.code
      };
      
      this.errors.push(errorInfo);
      console.error(`  ❌ Failed to fix broken links in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Create a pattern to match a broken link
   * @param {Object} link - Link object
   * @returns {string} Pattern to match
   */
  createLinkPattern(link) {
    if (link.type === 'markdown') {
      return `[${link.text}](${link.url})`;
    } else if (link.type === 'html') {
      // This is more complex for HTML links, simplified approach
      return link.url;
    } else if (link.type === 'image') {
      return `![${link.text}](${link.url})`;
    }
    return null;
  }

  /**
   * Create a pattern to match a broken reference
   * @param {Object} reference - Reference object
   * @returns {string} Pattern to match
   */
  createReferencePattern(reference) {
    if (reference.type === 'code') {
      return `\`${reference.fileName}\``;
    } else if (reference.type === 'include') {
      return `#include "${reference.fileName}"`;
    }
    return reference.fileName;
  }

  /**
   * Generate removal report
   * @returns {Object} Removal report
   */
  generateReport() {
    const totalSize = this.removedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    return {
      summary: {
        filesRemoved: this.removedFiles.length,
        referencesFixed: this.fixedReferences.reduce((sum, fix) => sum + fix.fixCount, 0),
        filesModified: this.fixedReferences.length,
        totalSizeBytes: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        errors: this.errors.length,
        dryRun: this.dryRun
      },
      files: {
        removed: this.removedFiles,
        modified: this.fixedReferences
      },
      errors: this.errors,
      breakdown: {
        byReason: this.groupFilesByReason(),
        byDirectory: this.groupFilesByDirectory()
      }
    };
  }

  /**
   * Group removed files by reason
   * @returns {Object} Files grouped by reason
   */
  groupFilesByReason() {
    const groups = {};
    this.removedFiles.forEach(file => {
      if (!groups[file.reason]) groups[file.reason] = [];
      groups[file.reason].push(path.relative(process.cwd(), file.path));
    });
    return groups;
  }

  /**
   * Group removed files by directory
   * @returns {Object} Files grouped by directory
   */
  groupFilesByDirectory() {
    const groups = {};
    this.removedFiles.forEach(file => {
      const dir = path.dirname(path.relative(process.cwd(), file.path));
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(path.basename(file.path));
    });
    return groups;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  const remover = new UnusedMarkdownRemover();
  
  remover.removeUnusedMarkdown({
    dryRun: dryRun
  }).then(report => {
    // Save report
    const reportPath = path.join('utils', 'analysis', `markdown-cleanup-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
    
    process.exit(0);
  }).catch(error => {
    console.error('❌ Markdown cleanup failed:', error.message);
    process.exit(1);
  });
}

module.exports = UnusedMarkdownRemover;