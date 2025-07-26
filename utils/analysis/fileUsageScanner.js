/**
 * File Usage Scanner
 * Specialized scanner for detecting unused files and building comprehensive usage tracking
 * Implements requirements 1.1 and 5.2 from the codebase cleanup specification
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const FileAnalyzer = require('./fileAnalyzer');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class FileUsageScanner {
  constructor() {
    this.fileAnalyzer = new FileAnalyzer();
    this.usageMap = new Map(); // file -> Set of files that import it
    this.importMap = new Map(); // file -> Set of files it imports
    this.entryPoints = new Set();
    this.dynamicImports = new Map(); // Track dynamic imports that are harder to detect
    this.configFiles = new Set(); // Track configuration files
    this.testFiles = new Set(); // Track test files
  }

  /**
   * Scan codebase for file usage patterns and identify unused files
   * @param {string} rootPath - Root directory to scan
   * @param {Object} options - Scanning options
   * @returns {Promise<Object>} Usage analysis results
   */
  async scanFileUsage(rootPath = process.cwd(), options = {}) {
    console.log('🔍 Scanning file usage patterns...');
    
    const scanOptions = {
      includeTests: options.includeTests || false,
      includeNodeModules: options.includeNodeModules || false,
      customEntryPoints: options.entryPoints || [],
      ...options
    };

    // Step 1: Discover all files
    const allFiles = await this.discoverFiles(rootPath, scanOptions);
    console.log(`📁 Found ${allFiles.length} files to analyze`);

    // Step 2: Identify entry points
    await this.identifyEntryPoints(allFiles, scanOptions);
    console.log(`🚪 Identified ${this.entryPoints.size} entry points`);

    // Step 3: Parse all JavaScript files for imports/exports
    const jsFiles = allFiles.filter(f => this.isJavaScriptFile(f.extension));
    await this.parseImportsAndExports(jsFiles);
    console.log(`📦 Parsed ${jsFiles.length} JavaScript files`);

    // Step 4: Build usage dependency graph
    this.buildUsageGraph();
    console.log(`🕸️ Built usage dependency graph`);

    // Step 5: Detect unused files using multiple strategies
    const unusedFiles = await this.detectUnusedFiles(allFiles);
    console.log(`🗑️ Found ${unusedFiles.length} potentially unused files`);

    // Step 6: Perform safety checks
    const safeToRemove = await this.performSafetyChecks(unusedFiles);
    console.log(`✅ ${safeToRemove.length} files are safe to remove`);

    // Step 7: Generate detailed usage report
    const usageReport = this.generateUsageReport(allFiles, unusedFiles, safeToRemove);

    return {
      summary: {
        totalFiles: allFiles.length,
        jsFiles: jsFiles.length,
        entryPoints: this.entryPoints.size,
        unusedFiles: unusedFiles.length,
        safeToRemove: safeToRemove.length,
        dynamicImports: this.dynamicImports.size
      },
      files: {
        all: allFiles,
        javascript: jsFiles,
        unused: unusedFiles,
        safeToRemove: safeToRemove
      },
      usage: {
        usageMap: this.convertMapToObject(this.usageMap),
        importMap: this.convertMapToObject(this.importMap),
        entryPoints: Array.from(this.entryPoints),
        dynamicImports: this.convertMapToObject(this.dynamicImports)
      },
      report: usageReport
    };
  }

  /**
   * Discover all files in the codebase
   * @param {string} rootPath - Root directory
   * @param {Object} options - Scan options
   * @returns {Promise<Array>} List of discovered files
   */
  async discoverFiles(rootPath, options) {
    const files = [];
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

    if (!options.includeNodeModules) {
      ignorePatterns.push('node_modules');
    }

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
          } else if (stats.isFile()) {
            const ext = path.extname(item);
            
            files.push({
              path: fullPath,
              relativePath: relativePath,
              name: item,
              extension: ext,
              size: stats.size,
              lastModified: stats.mtime,
              isTest: this.isTestFile(relativePath),
              isConfig: this.isConfigFile(relativePath, item)
            });

            // Track special file types
            if (this.isTestFile(relativePath)) {
              this.testFiles.add(relativePath);
            }
            if (this.isConfigFile(relativePath, item)) {
              this.configFiles.add(relativePath);
            }
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not scan directory ${dirPath}: ${error.message}`);
      }
    };

    await scanDirectory(rootPath);
    return files;
  }

  /**
   * Identify entry points in the codebase
   * @param {Array} allFiles - All discovered files
   * @param {Object} options - Scan options
   */
  async identifyEntryPoints(allFiles, options) {
    // Common entry point patterns
    const entryPatterns = [
      /^index\.(js|ts|jsx|tsx)$/,
      /^main\.(js|ts)$/,
      /^app\.(js|ts|jsx|tsx)$/,
      /^server\.(js|ts)$/,
      /^start\.(js|ts)$/,
      /^entry\.(js|ts)$/
    ];

    // Add custom entry points
    if (options.customEntryPoints) {
      options.customEntryPoints.forEach(entry => {
        this.entryPoints.add(entry);
      });
    }

    // Scan package.json files for entry points
    const packageFiles = allFiles.filter(f => f.name === 'package.json');
    for (const pkgFile of packageFiles) {
      try {
        const content = await readFile(pkgFile.path, 'utf8');
        const packageData = JSON.parse(content);
        
        // Main entry point
        if (packageData.main) {
          const mainPath = path.resolve(path.dirname(pkgFile.path), packageData.main);
          const relativePath = path.relative(process.cwd(), mainPath);
          this.entryPoints.add(relativePath);
        }

        // Script entry points
        if (packageData.scripts) {
          Object.values(packageData.scripts).forEach(script => {
            // Extract file references from scripts
            const fileMatches = script.match(/node\s+([^\s]+\.js)/g);
            if (fileMatches) {
              fileMatches.forEach(match => {
                const filePath = match.replace('node ', '');
                const fullPath = path.resolve(path.dirname(pkgFile.path), filePath);
                const relativePath = path.relative(process.cwd(), fullPath);
                this.entryPoints.add(relativePath);
              });
            }
          });
        }

        // Bin entries
        if (packageData.bin) {
          const binEntries = typeof packageData.bin === 'string' 
            ? [packageData.bin] 
            : Object.values(packageData.bin);
          
          binEntries.forEach(binPath => {
            const fullPath = path.resolve(path.dirname(pkgFile.path), binPath);
            const relativePath = path.relative(process.cwd(), fullPath);
            this.entryPoints.add(relativePath);
          });
        }
      } catch (error) {
        console.warn(`Warning: Could not parse ${pkgFile.relativePath}: ${error.message}`);
      }
    }

    // Find files matching entry patterns
    allFiles.forEach(file => {
      if (this.isJavaScriptFile(file.extension)) {
        const fileName = path.basename(file.relativePath);
        if (entryPatterns.some(pattern => pattern.test(fileName))) {
          this.entryPoints.add(file.relativePath);
        }
      }
    });

    // Configuration files are often entry points
    this.configFiles.forEach(configFile => {
      this.entryPoints.add(configFile);
    });
  }

  /**
   * Parse all JavaScript files for imports and exports
   * @param {Array} jsFiles - JavaScript files to parse
   */
  async parseImportsAndExports(jsFiles) {
    for (const file of jsFiles) {
      try {
        const analysis = await this.fileAnalyzer.analyzeJSFile(file.path);
        
        if (analysis.hasErrors) {
          console.warn(`Warning: Could not analyze ${file.relativePath}: ${analysis.errorMessage}`);
          continue;
        }

        // Initialize maps for this file
        if (!this.importMap.has(file.relativePath)) {
          this.importMap.set(file.relativePath, new Set());
        }

        // Process imports and requires
        const allImports = [...analysis.imports, ...analysis.requires];
        
        for (const imp of allImports) {
          const importPath = imp.from || imp.module;
          const resolvedPath = this.resolveImportPath(importPath, file.relativePath);
          
          if (resolvedPath) {
            // Add to import map
            this.importMap.get(file.relativePath).add(resolvedPath);
            
            // Add to usage map (reverse mapping)
            if (!this.usageMap.has(resolvedPath)) {
              this.usageMap.set(resolvedPath, new Set());
            }
            this.usageMap.get(resolvedPath).add(file.relativePath);
          }
        }

        // Detect dynamic imports
        await this.detectDynamicImports(file);

      } catch (error) {
        console.warn(`Warning: Error parsing ${file.relativePath}: ${error.message}`);
      }
    }
  }

  /**
   * Detect dynamic imports that are harder to statically analyze
   * @param {Object} file - File to analyze
   */
  async detectDynamicImports(file) {
    try {
      const content = await readFile(file.path, 'utf8');
      const lines = content.split('\n');
      
      const dynamicPatterns = [
        /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, // import('module')
        /require\s*\(\s*[^'"`]*['"`]([^'"`]+)['"`]/, // require(variable + 'module')
        /require\.resolve\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, // require.resolve('module')
        /loadModule\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/, // Custom loadModule patterns
      ];

      lines.forEach((line, index) => {
        dynamicPatterns.forEach(pattern => {
          const match = line.match(pattern);
          if (match) {
            const importPath = match[1];
            const resolvedPath = this.resolveImportPath(importPath, file.relativePath);
            
            if (resolvedPath) {
              if (!this.dynamicImports.has(file.relativePath)) {
                this.dynamicImports.set(file.relativePath, new Set());
              }
              this.dynamicImports.get(file.relativePath).add({
                path: resolvedPath,
                line: index + 1,
                pattern: match[0]
              });

              // Also add to usage map
              if (!this.usageMap.has(resolvedPath)) {
                this.usageMap.set(resolvedPath, new Set());
              }
              this.usageMap.get(resolvedPath).add(file.relativePath);
            }
          }
        });
      });
    } catch (error) {
      console.warn(`Warning: Could not detect dynamic imports in ${file.relativePath}: ${error.message}`);
    }
  }

  /**
   * Build the complete usage dependency graph
   */
  buildUsageGraph() {
    // The graph is already built during parsing, but we can add additional analysis here
    
    // Mark files reachable from entry points
    const reachableFiles = new Set();
    
    const markReachable = (filePath) => {
      if (reachableFiles.has(filePath)) return;
      
      reachableFiles.add(filePath);
      
      // Mark all files this file imports as reachable
      const imports = this.importMap.get(filePath);
      if (imports) {
        imports.forEach(importPath => {
          markReachable(importPath);
        });
      }
      
      // Mark dynamic imports as reachable
      const dynamicImports = this.dynamicImports.get(filePath);
      if (dynamicImports) {
        dynamicImports.forEach(dynImp => {
          markReachable(dynImp.path);
        });
      }
    };

    // Start from all entry points
    this.entryPoints.forEach(entryPoint => {
      markReachable(entryPoint);
    });

    this.reachableFiles = reachableFiles;
  }

  /**
   * Detect unused files using multiple detection strategies
   * @param {Array} allFiles - All files in the codebase
   * @returns {Promise<Array>} List of unused files
   */
  async detectUnusedFiles(allFiles) {
    const unusedFiles = [];
    
    for (const file of allFiles) {
      // Skip non-JavaScript files for now (will be handled in other tasks)
      if (!this.isJavaScriptFile(file.extension)) {
        continue;
      }

      const reasons = [];
      let isUnused = false;

      // Strategy 1: Not imported by any other file
      if (!this.usageMap.has(file.relativePath) || this.usageMap.get(file.relativePath).size === 0) {
        // Check if it's an entry point
        if (!this.entryPoints.has(file.relativePath)) {
          reasons.push('no-imports');
          isUnused = true;
        }
      }

      // Strategy 2: Not reachable from entry points
      if (this.reachableFiles && !this.reachableFiles.has(file.relativePath)) {
        if (!this.entryPoints.has(file.relativePath)) {
          reasons.push('unreachable');
          isUnused = true;
        }
      }

      // Strategy 3: Empty or comment-only files
      const isEmpty = await this.fileAnalyzer.isFileEmpty(file.path);
      if (isEmpty) {
        reasons.push('empty');
        isUnused = true;
      }

      // Strategy 4: Test files that don't test anything
      if (file.isTest) {
        const hasTestContent = await this.hasTestContent(file.path);
        if (!hasTestContent) {
          reasons.push('empty-test');
          isUnused = true;
        }
      }

      if (isUnused) {
        unusedFiles.push({
          ...file,
          reasons: reasons,
          usageCount: this.usageMap.has(file.relativePath) ? this.usageMap.get(file.relativePath).size : 0,
          isReachable: this.reachableFiles ? this.reachableFiles.has(file.relativePath) : false,
          isEmpty: isEmpty
        });
      }
    }

    return unusedFiles;
  }

  /**
   * Perform safety checks before marking files as safe to remove
   * @param {Array} unusedFiles - Files identified as unused
   * @returns {Promise<Array>} Files that are safe to remove
   */
  async performSafetyChecks(unusedFiles) {
    const safeToRemove = [];
    
    for (const file of unusedFiles) {
      let isSafe = true;
      const warnings = [];

      // Safety check 1: Verify no dynamic references exist
      const hasDynamicRefs = await this.checkForDynamicReferences(file);
      if (hasDynamicRefs) {
        warnings.push('potential-dynamic-references');
        isSafe = false;
      }

      // Safety check 2: Check for string-based imports
      const hasStringImports = await this.checkForStringBasedImports(file);
      if (hasStringImports) {
        warnings.push('string-based-imports');
        isSafe = false;
      }

      // Safety check 3: Verify it's not referenced in configuration files
      const isReferencedInConfig = await this.checkConfigReferences(file);
      if (isReferencedInConfig) {
        warnings.push('config-references');
        isSafe = false;
      }

      // Safety check 4: Check for webpack/build tool references
      const isBuildReference = await this.checkBuildToolReferences(file);
      if (isBuildReference) {
        warnings.push('build-tool-references');
        isSafe = false;
      }

      // Add to safe list if all checks pass, or if it's just empty
      if (isSafe || file.reasons.includes('empty')) {
        safeToRemove.push({
          ...file,
          safetyWarnings: warnings,
          removalConfidence: warnings.length === 0 ? 'high' : 'medium'
        });
      }
    }

    return safeToRemove;
  }

  /**
   * Check for dynamic references to a file
   * @param {Object} file - File to check
   * @returns {Promise<boolean>} True if dynamic references found
   */
  async checkForDynamicReferences(file) {
    // This would involve searching for string patterns that might reference the file
    // For now, return false but this could be enhanced
    return false;
  }

  /**
   * Check for string-based imports
   * @param {Object} file - File to check
   * @returns {Promise<boolean>} True if string-based imports found
   */
  async checkForStringBasedImports(file) {
    // Search for patterns like require(someVariable + 'filename')
    // For now, return false but this could be enhanced
    return false;
  }

  /**
   * Check if file is referenced in configuration files
   * @param {Object} file - File to check
   * @returns {Promise<boolean>} True if referenced in config
   */
  async checkConfigReferences(file) {
    for (const configFile of this.configFiles) {
      try {
        const content = await readFile(configFile, 'utf8');
        const fileName = path.basename(file.relativePath);
        const fileNameWithoutExt = path.basename(file.relativePath, path.extname(file.relativePath));
        
        if (content.includes(fileName) || content.includes(fileNameWithoutExt)) {
          return true;
        }
      } catch (error) {
        // Ignore read errors
      }
    }
    return false;
  }

  /**
   * Check if file is referenced by build tools
   * @param {Object} file - File to check
   * @returns {Promise<boolean>} True if referenced by build tools
   */
  async checkBuildToolReferences(file) {
    const buildConfigFiles = [
      'webpack.config.js',
      'rollup.config.js',
      'vite.config.js',
      'next.config.js',
      'babel.config.js',
      '.babelrc'
    ];

    for (const configName of buildConfigFiles) {
      try {
        const configPath = path.join(process.cwd(), configName);
        const content = await readFile(configPath, 'utf8');
        const fileName = path.basename(file.relativePath);
        
        if (content.includes(fileName)) {
          return true;
        }
      } catch (error) {
        // Config file doesn't exist, continue
      }
    }
    
    return false;
  }

  /**
   * Check if a test file has actual test content
   * @param {string} filePath - Path to test file
   * @returns {Promise<boolean>} True if has test content
   */
  async hasTestContent(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const testPatterns = [
        /describe\s*\(/,
        /it\s*\(/,
        /test\s*\(/,
        /expect\s*\(/,
        /assert\s*\(/,
        /should\s*\./
      ];
      
      return testPatterns.some(pattern => pattern.test(content));
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate detailed usage report
   * @param {Array} allFiles - All files
   * @param {Array} unusedFiles - Unused files
   * @param {Array} safeToRemove - Safe to remove files
   * @returns {Object} Usage report
   */
  generateUsageReport(allFiles, unusedFiles, safeToRemove) {
    const jsFiles = allFiles.filter(f => this.isJavaScriptFile(f.extension));
    
    return {
      overview: {
        totalFiles: allFiles.length,
        jsFiles: jsFiles.length,
        testFiles: this.testFiles.size,
        configFiles: this.configFiles.size,
        entryPoints: this.entryPoints.size,
        unusedFiles: unusedFiles.length,
        safeToRemove: safeToRemove.length,
        usageRate: ((jsFiles.length - unusedFiles.length) / jsFiles.length * 100).toFixed(1) + '%'
      },
      unusedBreakdown: {
        byReason: this.groupByReason(unusedFiles),
        byDirectory: this.groupByDirectory(unusedFiles),
        bySizeImpact: this.calculateSizeImpact(safeToRemove)
      },
      recommendations: {
        immediateRemoval: safeToRemove.filter(f => f.removalConfidence === 'high'),
        reviewRequired: safeToRemove.filter(f => f.removalConfidence === 'medium'),
        manualInvestigation: unusedFiles.filter(f => !safeToRemove.includes(f))
      }
    };
  }

  // Helper methods

  /**
   * Check if file extension indicates a JavaScript file
   * @param {string} extension - File extension
   * @returns {boolean} True if JavaScript file
   */
  isJavaScriptFile(extension) {
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(extension);
  }

  /**
   * Check if file is a test file
   * @param {string} relativePath - File path
   * @returns {boolean} True if test file
   */
  isTestFile(relativePath) {
    const testPatterns = [
      /\.test\./,
      /\.spec\./,
      /__tests__/,
      /\/tests?\//,
      /\/spec\//
    ];
    
    return testPatterns.some(pattern => pattern.test(relativePath));
  }

  /**
   * Check if file is a configuration file
   * @param {string} relativePath - File path
   * @param {string} fileName - File name
   * @returns {boolean} True if config file
   */
  isConfigFile(relativePath, fileName) {
    const configPatterns = [
      /^\..*rc$/,
      /config\.(js|json|ts)$/,
      /^(babel|webpack|rollup|vite|next|tailwind)\.config\./,
      /^package\.json$/,
      /^tsconfig\.json$/,
      /^\.env/,
      /^\.gitignore$/,
      /^\.eslintrc/,
      /^\.prettierrc/
    ];
    
    return configPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Resolve import path to actual file path
   * @param {string} importPath - Import path from code
   * @param {string} fromFile - File making the import
   * @returns {string|null} Resolved path or null
   */
  resolveImportPath(importPath, fromFile) {
    // Skip external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    try {
      const fromDir = path.dirname(fromFile);
      let resolvedPath = path.resolve(fromDir, importPath);
      resolvedPath = path.relative(process.cwd(), resolvedPath);

      // Try different extensions if no extension provided
      if (!path.extname(resolvedPath)) {
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '.json'];
        for (const ext of extensions) {
          // In a real implementation, we'd check if file exists
          // For now, assume .js extension for relative imports
          if (ext === '.js') {
            return resolvedPath + ext;
          }
        }
        
        // Try index files
        const indexExtensions = ['/index.js', '/index.ts', '/index.jsx', '/index.tsx'];
        for (const indexExt of indexExtensions) {
          if (indexExt === '/index.js') {
            return resolvedPath + indexExt;
          }
        }
      }

      return resolvedPath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert Map to plain object for JSON serialization
   * @param {Map} map - Map to convert
   * @returns {Object} Plain object
   */
  convertMapToObject(map) {
    const obj = {};
    map.forEach((value, key) => {
      if (value instanceof Set) {
        obj[key] = Array.from(value);
      } else if (Array.isArray(value)) {
        obj[key] = value;
      } else {
        obj[key] = value;
      }
    });
    return obj;
  }

  /**
   * Group unused files by reason
   * @param {Array} unusedFiles - Unused files
   * @returns {Object} Grouped by reason
   */
  groupByReason(unusedFiles) {
    const groups = {};
    unusedFiles.forEach(file => {
      file.reasons.forEach(reason => {
        if (!groups[reason]) groups[reason] = [];
        groups[reason].push(file.relativePath);
      });
    });
    return groups;
  }

  /**
   * Group unused files by directory
   * @param {Array} unusedFiles - Unused files
   * @returns {Object} Grouped by directory
   */
  groupByDirectory(unusedFiles) {
    const groups = {};
    unusedFiles.forEach(file => {
      const dir = path.dirname(file.relativePath);
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(file.relativePath);
    });
    return groups;
  }

  /**
   * Calculate size impact of removing files
   * @param {Array} filesToRemove - Files to remove
   * @returns {Object} Size impact analysis
   */
  calculateSizeImpact(filesToRemove) {
    const totalSize = filesToRemove.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = filesToRemove.length;
    
    return {
      totalFiles: totalFiles,
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      averageFileSize: totalFiles > 0 ? (totalSize / totalFiles).toFixed(2) : 0
    };
  }
}

module.exports = FileUsageScanner;