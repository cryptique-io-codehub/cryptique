/**
 * File Analysis Utilities
 * Scans the codebase for imports, exports, and usage patterns
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class FileAnalyzer {
  constructor() {
    this.supportedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.json', '.md'];
    this.ignorePatterns = [
      'node_modules',
      '.git',
      'build',
      'dist',
      'coverage',
      '.next',
      '.vercel',
      'logs'
    ];
  }

  /**
   * Recursively scan directory for files
   * @param {string} dirPath - Directory path to scan
   * @param {Array} fileList - Accumulator for file list
   * @returns {Promise<Array>} List of file objects
   */
  async scanDirectory(dirPath, fileList = []) {
    try {
      const items = await readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await stat(fullPath);
        
        // Skip ignored patterns
        if (this.ignorePatterns.some(pattern => fullPath.includes(pattern))) {
          continue;
        }
        
        if (stats.isDirectory()) {
          await this.scanDirectory(fullPath, fileList);
        } else if (stats.isFile()) {
          const ext = path.extname(item);
          if (this.supportedExtensions.includes(ext)) {
            fileList.push({
              path: fullPath,
              relativePath: path.relative(process.cwd(), fullPath),
              name: item,
              extension: ext,
              size: stats.size,
              lastModified: stats.mtime,
              isDirectory: false
            });
          }
        }
      }
      
      return fileList;
    } catch (error) {
      console.error(`Error scanning directory ${dirPath}:`, error.message);
      return fileList;
    }
  }

  /**
   * Analyze JavaScript/TypeScript file for imports and exports
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeJSFile(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      const analysis = {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        imports: [],
        exports: [],
        requires: [],
        moduleExports: [],
        dependencies: new Set(),
        isEmpty: content.trim().length === 0,
        lineCount: lines.length,
        hasErrors: false,
        errorMessage: null
      };

      // Analyze each line for import/export patterns
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || !trimmedLine) {
          return;
        }

        // ES6 imports
        const importMatch = trimmedLine.match(/^import\s+(.+?)\s+from\s+['"`](.+?)['"`]/);
        if (importMatch) {
          analysis.imports.push({
            line: index + 1,
            imported: importMatch[1],
            from: importMatch[2],
            type: 'es6'
          });
          analysis.dependencies.add(importMatch[2]);
        }

        // CommonJS requires
        const requireMatch = trimmedLine.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"`](.+?)['"`]\)/);
        if (requireMatch) {
          analysis.requires.push({
            line: index + 1,
            variable: requireMatch[1],
            module: requireMatch[2],
            type: 'commonjs'
          });
          analysis.dependencies.add(requireMatch[2]);
        }

        // Direct require calls
        const directRequireMatch = trimmedLine.match(/require\(['"`](.+?)['"`]\)/);
        if (directRequireMatch && !requireMatch) {
          analysis.requires.push({
            line: index + 1,
            variable: null,
            module: directRequireMatch[1],
            type: 'direct'
          });
          analysis.dependencies.add(directRequireMatch[1]);
        }

        // ES6 exports
        const exportMatch = trimmedLine.match(/^export\s+(.+)/);
        if (exportMatch) {
          analysis.exports.push({
            line: index + 1,
            exported: exportMatch[1],
            type: 'es6'
          });
        }

        // CommonJS module.exports
        const moduleExportMatch = trimmedLine.match(/module\.exports\s*=\s*(.+)/);
        if (moduleExportMatch) {
          analysis.moduleExports.push({
            line: index + 1,
            exported: moduleExportMatch[1],
            type: 'commonjs'
          });
        }
      });

      // Convert Set to Array for JSON serialization
      analysis.dependencies = Array.from(analysis.dependencies);
      
      return analysis;
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        hasErrors: true,
        errorMessage: error.message,
        imports: [],
        exports: [],
        requires: [],
        moduleExports: [],
        dependencies: [],
        isEmpty: false,
        lineCount: 0
      };
    }
  }

  /**
   * Analyze package.json file for dependencies
   * @param {string} filePath - Path to package.json
   * @returns {Promise<Object>} Package analysis
   */
  async analyzePackageJson(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const packageData = JSON.parse(content);
      
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        name: packageData.name,
        version: packageData.version,
        dependencies: packageData.dependencies || {},
        devDependencies: packageData.devDependencies || {},
        scripts: packageData.scripts || {},
        allDependencies: {
          ...packageData.dependencies,
          ...packageData.devDependencies
        }
      };
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        hasErrors: true,
        errorMessage: error.message,
        dependencies: {},
        devDependencies: {},
        scripts: {},
        allDependencies: {}
      };
    }
  }

  /**
   * Check if a file is empty or contains only whitespace/comments
   * @param {string} filePath - Path to the file
   * @returns {Promise<boolean>} True if file is effectively empty
   */
  async isFileEmpty(filePath) {
    try {
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Check if all lines are empty, whitespace, or comments
      const meaningfulLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('/*') && 
               !trimmed.startsWith('*') &&
               trimmed !== '*/';
      });
      
      return meaningfulLines.length === 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file statistics
   * @param {string} filePath - Path to the file
   * @returns {Promise<Object>} File statistics
   */
  async getFileStats(filePath) {
    try {
      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        size: stats.size,
        lastModified: stats.mtime,
        lineCount: lines.length,
        isEmpty: content.trim().length === 0,
        extension: path.extname(filePath)
      };
    } catch (error) {
      return {
        path: filePath,
        relativePath: path.relative(process.cwd(), filePath),
        hasErrors: true,
        errorMessage: error.message
      };
    }
  }
}

module.exports = FileAnalyzer;