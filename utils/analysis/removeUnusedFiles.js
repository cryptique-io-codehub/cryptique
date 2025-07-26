/**
 * Remove Unused Files Script
 * Safely removes unused JavaScript files identified by the file usage scanner
 * Implements requirements 1.3, 1.4, and 5.2 from the codebase cleanup specification
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const FileUsageScanner = require('./fileUsageScanner');

const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class UnusedFileRemover {
  constructor() {
    this.scanner = new FileUsageScanner();
    this.removedFiles = [];
    this.removedDirectories = [];
    this.errors = [];
    this.dryRun = false;
  }

  /**
   * Remove unused files safely
   * @param {Object} options - Removal options
   * @returns {Promise<Object>} Removal results
   */
  async removeUnusedFiles(options = {}) {
    this.dryRun = options.dryRun || false;
    const rootPath = options.rootPath || process.cwd();
    
    console.log(`🗑️ ${this.dryRun ? 'DRY RUN: ' : ''}Starting unused file removal...`);
    
    // Step 1: Scan for unused files
    console.log('🔍 Scanning for unused files...');
    const scanResults = await this.scanner.scanFileUsage(rootPath, {
      includeTests: options.includeTests || false,
      includeNodeModules: false
    });

    // Step 2: Filter out files that should be preserved
    const safeToRemove = this.filterSafeFiles(scanResults.files.safeToRemove);
    console.log(`📋 Found ${safeToRemove.length} files safe to remove`);

    if (safeToRemove.length === 0) {
      console.log('✅ No unused files found to remove');
      return this.generateReport();
    }

    // Step 2: Create backup if not dry run
    if (!this.dryRun) {
      await this.createBackup(safeToRemove);
    }

    // Step 3: Remove files
    console.log(`🗑️ ${this.dryRun ? 'Would remove' : 'Removing'} ${safeToRemove.length} files...`);
    
    for (const file of safeToRemove) {
      await this.removeFile(file);
    }

    // Step 4: Clean up empty directories
    console.log('📁 Cleaning up empty directories...');
    await this.cleanupEmptyDirectories(rootPath);

    // Step 5: Generate report
    const report = this.generateReport();
    
    console.log(`✅ ${this.dryRun ? 'Dry run' : 'Removal'} completed!`);
    console.log(`📊 Files ${this.dryRun ? 'would be' : ''} removed: ${this.removedFiles.length}`);
    console.log(`📁 Directories ${this.dryRun ? 'would be' : ''} removed: ${this.removedDirectories.length}`);
    
    if (this.errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${this.errors.length}`);
    }

    return report;
  }

  /**
   * Filter files to exclude critical ones that should be preserved
   * @param {Array} files - Files identified as safe to remove
   * @returns {Array} Filtered list of files
   */
  filterSafeFiles(files) {
    const preservePatterns = [
      // Preserve analysis tools themselves
      /utils[\/\\]analysis[\/\\]/,
      // Preserve important configuration files
      /ecosystem\.config\.js$/,
      /vercel\.json$/,
      // Preserve any files that might be used by build processes
      /\.config\./,
      // Preserve package.json files
      /package\.json$/,
      // Preserve environment files
      /\.env/
    ];

    const preserveSpecificFiles = [
      // Keep the current removal script
      'utils/analysis/removeUnusedFiles.js',
      'utils\\analysis\\removeUnusedFiles.js'
    ];

    return files.filter(file => {
      // Check specific files to preserve
      if (preserveSpecificFiles.includes(file.relativePath)) {
        console.log(`🛡️ Preserving: ${file.relativePath} (analysis tool)`);
        return false;
      }

      // Check patterns to preserve
      for (const pattern of preservePatterns) {
        if (pattern.test(file.relativePath)) {
          console.log(`🛡️ Preserving: ${file.relativePath} (matches preserve pattern)`);
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Create backup of files before removal
   * @param {Array} filesToRemove - Files to backup
   */
  async createBackup(filesToRemove) {
    const backupDir = path.join('utils', 'analysis', 'backups', `removal-${Date.now()}`);
    
    try {
      await fs.promises.mkdir(backupDir, { recursive: true });
      console.log(`💾 Creating backup in ${backupDir}...`);

      for (const file of filesToRemove) {
        try {
          const backupPath = path.join(backupDir, file.relativePath);
          const backupDirPath = path.dirname(backupPath);
          
          await fs.promises.mkdir(backupDirPath, { recursive: true });
          await fs.promises.copyFile(file.path, backupPath);
        } catch (error) {
          console.warn(`Warning: Could not backup ${file.relativePath}: ${error.message}`);
        }
      }

      // Create backup manifest
      const manifest = {
        timestamp: new Date().toISOString(),
        totalFiles: filesToRemove.length,
        files: filesToRemove.map(f => ({
          path: f.relativePath,
          size: f.size,
          reasons: f.reasons,
          confidence: f.removalConfidence
        }))
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
   * Remove a single file
   * @param {Object} file - File to remove
   */
  async removeFile(file) {
    try {
      if (this.dryRun) {
        console.log(`  [DRY RUN] Would remove: ${file.relativePath}`);
        this.removedFiles.push({
          path: file.relativePath,
          size: file.size,
          reasons: file.reasons,
          status: 'would-remove'
        });
      } else {
        await unlink(file.path);
        console.log(`  ✅ Removed: ${file.relativePath}`);
        this.removedFiles.push({
          path: file.relativePath,
          size: file.size,
          reasons: file.reasons,
          status: 'removed'
        });
      }
    } catch (error) {
      const errorInfo = {
        path: file.relativePath,
        error: error.message,
        code: error.code
      };
      
      this.errors.push(errorInfo);
      console.error(`  ❌ Failed to remove ${file.relativePath}: ${error.message}`);
    }
  }

  /**
   * Clean up empty directories after file removal
   * @param {string} rootPath - Root path to scan
   */
  async cleanupEmptyDirectories(rootPath) {
    const directoriesToCheck = new Set();
    
    // Collect all parent directories of removed files
    this.removedFiles.forEach(file => {
      let dir = path.dirname(file.path);
      while (dir !== rootPath && dir !== '.' && dir !== path.dirname(dir)) {
        directoriesToCheck.add(dir);
        dir = path.dirname(dir);
      }
    });

    // Sort directories by depth (deepest first) to remove from bottom up
    const sortedDirs = Array.from(directoriesToCheck).sort((a, b) => {
      const depthA = a.split(path.sep).length;
      const depthB = b.split(path.sep).length;
      return depthB - depthA;
    });

    for (const dir of sortedDirs) {
      await this.removeEmptyDirectory(dir);
    }
  }

  /**
   * Remove directory if it's empty
   * @param {string} dirPath - Directory path
   */
  async removeEmptyDirectory(dirPath) {
    try {
      const fullPath = path.resolve(dirPath);
      const items = await readdir(fullPath);
      
      if (items.length === 0) {
        if (this.dryRun) {
          console.log(`  [DRY RUN] Would remove empty directory: ${dirPath}`);
          this.removedDirectories.push({
            path: dirPath,
            status: 'would-remove'
          });
        } else {
          await rmdir(fullPath);
          console.log(`  ✅ Removed empty directory: ${dirPath}`);
          this.removedDirectories.push({
            path: dirPath,
            status: 'removed'
          });
        }
      }
    } catch (error) {
      // Directory might not exist or not be empty, which is fine
      if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') {
        console.warn(`Warning: Could not check/remove directory ${dirPath}: ${error.message}`);
      }
    }
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
        directoriesRemoved: this.removedDirectories.length,
        totalSizeBytes: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        errors: this.errors.length,
        dryRun: this.dryRun
      },
      files: this.removedFiles,
      directories: this.removedDirectories,
      errors: this.errors,
      breakdown: {
        byReason: this.groupFilesByReason(),
        byDirectory: this.groupFilesByDirectory(),
        bySize: this.groupFilesBySize()
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
      if (file.reasons) {
        file.reasons.forEach(reason => {
          if (!groups[reason]) groups[reason] = [];
          groups[reason].push(file.path);
        });
      }
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
      const dir = path.dirname(file.path);
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(path.basename(file.path));
    });
    return groups;
  }

  /**
   * Group removed files by size
   * @returns {Object} Files grouped by size ranges
   */
  groupFilesBySize() {
    const ranges = {
      'small (< 1KB)': [],
      'medium (1-10KB)': [],
      'large (10-100KB)': [],
      'very-large (> 100KB)': []
    };

    this.removedFiles.forEach(file => {
      const sizeKB = (file.size || 0) / 1024;
      if (sizeKB < 1) {
        ranges['small (< 1KB)'].push(file.path);
      } else if (sizeKB < 10) {
        ranges['medium (1-10KB)'].push(file.path);
      } else if (sizeKB < 100) {
        ranges['large (10-100KB)'].push(file.path);
      } else {
        ranges['very-large (> 100KB)'].push(file.path);
      }
    });

    return ranges;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const includeTests = args.includes('--include-tests') || args.includes('-t');

  const remover = new UnusedFileRemover();
  
  remover.removeUnusedFiles({
    dryRun: dryRun,
    includeTests: includeTests
  }).then(report => {
    // Save report
    const reportPath = path.join('utils', 'analysis', `removal-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
    
    process.exit(0);
  }).catch(error => {
    console.error('❌ Removal failed:', error.message);
    process.exit(1);
  });
}

module.exports = UnusedFileRemover;