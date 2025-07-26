/**
 * Dependency Mapping Utilities
 * Tracks file relationships and builds dependency graphs
 */

const path = require('path');
const FileAnalyzer = require('./fileAnalyzer');
const MarkdownAnalyzer = require('./markdownAnalyzer');

class DependencyMapper {
  constructor() {
    this.fileAnalyzer = new FileAnalyzer();
    this.markdownAnalyzer = new MarkdownAnalyzer();
    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();
    this.packageDependencies = new Map();
  }

  /**
   * Build complete dependency graph for the project
   * @param {string} rootPath - Root directory to analyze
   * @returns {Promise<Object>} Dependency analysis results
   */
  async buildDependencyGraph(rootPath = process.cwd()) {
    console.log('Building dependency graph...');
    
    // Scan all files
    const allFiles = await this.fileAnalyzer.scanDirectory(rootPath);
    console.log(`Found ${allFiles.length} files to analyze`);
    
    // Separate different file types
    const jsFiles = allFiles.filter(f => ['.js', '.jsx', '.ts', '.tsx'].includes(f.extension));
    const packageFiles = allFiles.filter(f => f.name === 'package.json');
    const mdFiles = allFiles.filter(f => f.extension === '.md');
    
    // Analyze JavaScript files
    const jsAnalysis = await this.analyzeJavaScriptFiles(jsFiles);
    
    // Analyze package.json files
    const packageAnalysis = await this.analyzePackageFiles(packageFiles);
    
    // Analyze markdown files
    const markdownAnalysis = await this.markdownAnalyzer.analyzeMarkdownFiles(mdFiles, rootPath);
    
    // Build dependency relationships
    const dependencyRelationships = this.buildRelationships(jsAnalysis);
    
    // Find unused files
    const unusedFiles = this.findUnusedFiles(jsAnalysis, dependencyRelationships);
    
    // Find duplicate dependencies
    const duplicateDependencies = this.findDuplicateDependencies(packageAnalysis);
    
    return {
      summary: {
        totalFiles: allFiles.length,
        jsFiles: jsFiles.length,
        packageFiles: packageFiles.length,
        mdFiles: mdFiles.length,
        unusedFiles: unusedFiles.length,
        duplicateDependencies: duplicateDependencies.length,
        unusedMarkdownFiles: markdownAnalysis.summary.unusedFiles,
        brokenMarkdownLinks: markdownAnalysis.summary.brokenLinks
      },
      files: {
        all: allFiles,
        javascript: jsAnalysis,
        packages: packageAnalysis,
        markdown: markdownAnalysis
      },
      dependencies: {
        graph: this.dependencyGraph,
        reverse: this.reverseDependencyGraph,
        relationships: dependencyRelationships,
        unused: unusedFiles,
        duplicates: duplicateDependencies
      }
    };
  }

  /**
   * Analyze all JavaScript files for imports/exports
   * @param {Array} jsFiles - List of JavaScript files
   * @returns {Promise<Array>} Analysis results
   */
  async analyzeJavaScriptFiles(jsFiles) {
    const results = [];
    
    for (const file of jsFiles) {
      console.log(`Analyzing: ${file.relativePath}`);
      const analysis = await this.fileAnalyzer.analyzeJSFile(file.path);
      results.push(analysis);
    }
    
    return results;
  }

  /**
   * Analyze all package.json files
   * @param {Array} packageFiles - List of package.json files
   * @returns {Promise<Array>} Package analysis results
   */
  async analyzePackageFiles(packageFiles) {
    const results = [];
    
    for (const file of packageFiles) {
      console.log(`Analyzing package: ${file.relativePath}`);
      const analysis = await this.fileAnalyzer.analyzePackageJson(file.path);
      results.push(analysis);
      
      // Store in package dependencies map
      this.packageDependencies.set(file.relativePath, analysis);
    }
    
    return results;
  }

  /**
   * Build relationships between files based on imports
   * @param {Array} jsAnalysis - JavaScript file analysis results
   * @returns {Object} Relationship mappings
   */
  buildRelationships(jsAnalysis) {
    const relationships = {
      imports: new Map(),
      exports: new Map(),
      circular: [],
      orphaned: []
    };

    // Build forward and reverse dependency graphs
    jsAnalysis.forEach(file => {
      const filePath = file.relativePath;
      
      // Initialize maps
      if (!this.dependencyGraph.has(filePath)) {
        this.dependencyGraph.set(filePath, new Set());
      }
      if (!this.reverseDependencyGraph.has(filePath)) {
        this.reverseDependencyGraph.set(filePath, new Set());
      }

      // Process imports and requires
      [...file.imports, ...file.requires].forEach(dep => {
        const resolvedPath = this.resolveDependencyPath(dep.from || dep.module, filePath);
        
        if (resolvedPath) {
          // Add to forward graph
          this.dependencyGraph.get(filePath).add(resolvedPath);
          
          // Add to reverse graph
          if (!this.reverseDependencyGraph.has(resolvedPath)) {
            this.reverseDependencyGraph.set(resolvedPath, new Set());
          }
          this.reverseDependencyGraph.get(resolvedPath).add(filePath);
          
          // Store in relationships
          if (!relationships.imports.has(filePath)) {
            relationships.imports.set(filePath, []);
          }
          relationships.imports.get(filePath).push({
            dependency: resolvedPath,
            type: dep.type,
            line: dep.line
          });
        }
      });

      // Track files that export something
      if (file.exports.length > 0 || file.moduleExports.length > 0) {
        relationships.exports.set(filePath, {
          exports: file.exports,
          moduleExports: file.moduleExports
        });
      }
    });

    // Detect circular dependencies
    relationships.circular = this.detectCircularDependencies();
    
    // Find orphaned files (no imports or exports)
    relationships.orphaned = jsAnalysis
      .filter(file => 
        file.imports.length === 0 && 
        file.requires.length === 0 && 
        file.exports.length === 0 && 
        file.moduleExports.length === 0 &&
        !file.isEmpty
      )
      .map(file => file.relativePath);

    return relationships;
  }

  /**
   * Resolve relative import paths to absolute paths
   * @param {string} importPath - Import path from code
   * @param {string} fromFile - File making the import
   * @returns {string|null} Resolved path or null if external
   */
  resolveDependencyPath(importPath, fromFile) {
    // Skip external packages (no relative path indicators)
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      return null;
    }

    try {
      const fromDir = path.dirname(fromFile);
      let resolvedPath = path.resolve(fromDir, importPath);
      
      // Make relative to project root
      resolvedPath = path.relative(process.cwd(), resolvedPath);
      
      // Try common extensions if no extension provided
      if (!path.extname(resolvedPath)) {
        const extensions = ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];
        for (const ext of extensions) {
          const testPath = resolvedPath + ext;
          // In a real implementation, we'd check if file exists
          // For now, assume .js extension
          if (ext === '.js') {
            return testPath;
          }
        }
      }
      
      return resolvedPath;
    } catch (error) {
      return null;
    }
  }

  /**
   * Detect circular dependencies in the dependency graph
   * @returns {Array} List of circular dependency chains
   */
  detectCircularDependencies() {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push([...path.slice(cycleStart), node]);
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const dependencies = this.dependencyGraph.get(node) || new Set();
      for (const dep of dependencies) {
        dfs(dep, [...path]);
      }

      recursionStack.delete(node);
    };

    // Check all nodes
    for (const node of this.dependencyGraph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * Find files that are not imported by any other file
   * @param {Array} jsAnalysis - JavaScript file analysis results
   * @param {Object} relationships - Dependency relationships
   * @returns {Array} List of unused files
   */
  findUnusedFiles(jsAnalysis, relationships) {
    const unusedFiles = [];
    
    jsAnalysis.forEach(file => {
      const filePath = file.relativePath;
      const isImported = this.reverseDependencyGraph.has(filePath) && 
                        this.reverseDependencyGraph.get(filePath).size > 0;
      
      // Skip entry points (common entry file names)
      const entryPoints = ['index.js', 'app.js', 'main.js', 'server.js'];
      const isEntryPoint = entryPoints.some(entry => filePath.endsWith(entry));
      
      if (!isImported && !isEntryPoint && !file.isEmpty) {
        unusedFiles.push({
          path: filePath,
          reason: 'no-imports',
          size: file.lineCount,
          hasExports: file.exports.length > 0 || file.moduleExports.length > 0
        });
      }
      
      // Also check for empty files
      if (file.isEmpty) {
        unusedFiles.push({
          path: filePath,
          reason: 'empty',
          size: 0,
          hasExports: false
        });
      }
    });
    
    return unusedFiles;
  }

  /**
   * Find duplicate dependencies across package.json files
   * @param {Array} packageAnalysis - Package analysis results
   * @returns {Array} List of duplicate dependencies
   */
  findDuplicateDependencies(packageAnalysis) {
    const dependencyMap = new Map();
    const duplicates = [];
    
    // Collect all dependencies with their versions
    packageAnalysis.forEach(pkg => {
      Object.entries(pkg.allDependencies).forEach(([name, version]) => {
        if (!dependencyMap.has(name)) {
          dependencyMap.set(name, []);
        }
        dependencyMap.get(name).push({
          package: pkg.relativePath,
          version: version,
          type: pkg.dependencies[name] ? 'dependency' : 'devDependency'
        });
      });
    });
    
    // Find duplicates
    dependencyMap.forEach((occurrences, depName) => {
      if (occurrences.length > 1) {
        const versions = [...new Set(occurrences.map(o => o.version))];
        duplicates.push({
          name: depName,
          occurrences: occurrences,
          versionConflict: versions.length > 1,
          versions: versions
        });
      }
    });
    
    return duplicates;
  }

  /**
   * Get files that depend on a specific file
   * @param {string} filePath - Target file path
   * @returns {Array} List of dependent files
   */
  getDependents(filePath) {
    const dependents = this.reverseDependencyGraph.get(filePath);
    return dependents ? Array.from(dependents) : [];
  }

  /**
   * Get files that a specific file depends on
   * @param {string} filePath - Source file path
   * @returns {Array} List of dependencies
   */
  getDependencies(filePath) {
    const dependencies = this.dependencyGraph.get(filePath);
    return dependencies ? Array.from(dependencies) : [];
  }

  /**
   * Check if a file can be safely removed
   * @param {string} filePath - File to check
   * @returns {Object} Safety analysis
   */
  canSafelyRemove(filePath) {
    const dependents = this.getDependents(filePath);
    const dependencies = this.getDependencies(filePath);
    
    return {
      canRemove: dependents.length === 0,
      dependents: dependents,
      dependencies: dependencies,
      reason: dependents.length === 0 ? 'no-dependents' : 'has-dependents'
    };
  }
}

module.exports = DependencyMapper;