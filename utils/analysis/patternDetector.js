/**
 * Pattern Detection Utilities
 * Identifies duplicate code blocks and common patterns
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const crypto = require('crypto');

const readFile = promisify(fs.readFile);

class PatternDetector {
  constructor() {
    this.minPatternLength = 5; // Minimum lines for a pattern
    this.similarityThreshold = 0.8; // 80% similarity threshold
    this.patterns = new Map();
    this.duplicateBlocks = [];
  }

  /**
   * Detect duplicate code patterns across files
   * @param {Array} fileAnalysis - Array of file analysis results
   * @returns {Promise<Object>} Pattern detection results
   */
  async detectPatterns(fileAnalysis) {
    console.log('Detecting code patterns...');
    
    const results = {
      duplicateBlocks: [],
      commonPatterns: [],
      similarFunctions: [],
      duplicateImports: [],
      duplicateConfigurations: []
    };

    // Analyze each file for patterns
    for (const file of fileAnalysis) {
      if (file.hasErrors || file.isEmpty) continue;
      
      try {
        const content = await readFile(file.path, 'utf8');
        const lines = content.split('\n');
        
        // Extract code blocks
        const codeBlocks = this.extractCodeBlocks(lines, file.relativePath);
        
        // Find duplicate blocks
        const duplicates = await this.findDuplicateBlocks(codeBlocks);
        results.duplicateBlocks.push(...duplicates);
        
        // Extract function patterns
        const functions = this.extractFunctions(lines, file.relativePath);
        results.similarFunctions.push(...functions);
        
        // Analyze import patterns
        const importPatterns = this.analyzeImportPatterns(file);
        results.duplicateImports.push(...importPatterns);
        
        // Detect configuration patterns
        const configPatterns = this.detectConfigurationPatterns(lines, file.relativePath);
        results.duplicateConfigurations.push(...configPatterns);
        
      } catch (error) {
        console.error(`Error analyzing patterns in ${file.relativePath}:`, error.message);
      }
    }

    // Find common patterns across all files
    results.commonPatterns = this.findCommonPatterns();
    
    // Group similar patterns
    results.duplicateBlocks = this.groupSimilarBlocks(results.duplicateBlocks);
    results.similarFunctions = this.groupSimilarFunctions(results.similarFunctions);
    
    return results;
  }

  /**
   * Extract meaningful code blocks from file lines
   * @param {Array} lines - File lines
   * @param {string} filePath - File path
   * @returns {Array} Code blocks
   */
  extractCodeBlocks(lines, filePath) {
    const blocks = [];
    let currentBlock = [];
    let blockStart = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        if (currentBlock.length >= this.minPatternLength) {
          blocks.push({
            lines: [...currentBlock],
            startLine: blockStart + 1,
            endLine: i,
            filePath: filePath,
            hash: this.generateBlockHash(currentBlock)
          });
        }
        currentBlock = [];
        blockStart = i + 1;
        continue;
      }
      
      currentBlock.push(line);
    }
    
    // Add final block if it exists
    if (currentBlock.length >= this.minPatternLength) {
      blocks.push({
        lines: [...currentBlock],
        startLine: blockStart + 1,
        endLine: lines.length,
        filePath: filePath,
        hash: this.generateBlockHash(currentBlock)
      });
    }
    
    return blocks;
  }

  /**
   * Generate hash for a code block
   * @param {Array} lines - Code lines
   * @returns {string} Hash
   */
  generateBlockHash(lines) {
    // Normalize lines by removing variable names and whitespace
    const normalized = lines.map(line => 
      line.replace(/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/g, 'VAR')
          .replace(/\s+/g, ' ')
          .trim()
    ).join('\n');
    
    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  /**
   * Find duplicate code blocks
   * @param {Array} codeBlocks - Code blocks to analyze
   * @returns {Promise<Array>} Duplicate blocks
   */
  async findDuplicateBlocks(codeBlocks) {
    const duplicates = [];
    const hashMap = new Map();
    
    // Group blocks by hash
    codeBlocks.forEach(block => {
      if (!hashMap.has(block.hash)) {
        hashMap.set(block.hash, []);
      }
      hashMap.get(block.hash).push(block);
    });
    
    // Find groups with multiple blocks (duplicates)
    hashMap.forEach((blocks, hash) => {
      if (blocks.length > 1) {
        duplicates.push({
          hash: hash,
          occurrences: blocks,
          pattern: blocks[0].lines.slice(0, 3), // First 3 lines as preview
          similarity: 1.0, // Exact match
          consolidationOpportunity: true
        });
      }
    });
    
    return duplicates;
  }

  /**
   * Extract function definitions from code
   * @param {Array} lines - File lines
   * @param {string} filePath - File path
   * @returns {Array} Function definitions
   */
  extractFunctions(lines, filePath) {
    const functions = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Match various function patterns
      const patterns = [
        /^function\s+(\w+)\s*\(/,                    // function name()
        /^const\s+(\w+)\s*=\s*function/,            // const name = function
        /^const\s+(\w+)\s*=\s*\(/,                  // const name = (
        /^(\w+)\s*:\s*function/,                     // name: function
        /^(\w+)\s*:\s*\(/,                          // name: (
        /^async\s+function\s+(\w+)/,                // async function name
        /^const\s+(\w+)\s*=\s*async/                // const name = async
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const functionName = match[1];
          const functionBody = this.extractFunctionBody(lines, i);
          
          functions.push({
            name: functionName,
            startLine: i + 1,
            endLine: i + functionBody.length,
            body: functionBody,
            filePath: filePath,
            signature: this.generateFunctionSignature(functionBody),
            complexity: this.calculateComplexity(functionBody)
          });
          break;
        }
      }
    }
    
    return functions;
  }

  /**
   * Extract function body starting from a line
   * @param {Array} lines - File lines
   * @param {number} startIndex - Starting line index
   * @returns {Array} Function body lines
   */
  extractFunctionBody(lines, startIndex) {
    const body = [];
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      body.push(line);
      
      // Count braces to find function end
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return body;
          }
        }
      }
      
      // Limit function body extraction
      if (body.length > 100) break;
    }
    
    return body;
  }

  /**
   * Generate function signature for comparison
   * @param {Array} functionBody - Function body lines
   * @returns {string} Function signature
   */
  generateFunctionSignature(functionBody) {
    // Extract key patterns from function body
    const patterns = [];
    
    functionBody.forEach(line => {
      const trimmed = line.trim();
      
      // Extract control structures
      if (trimmed.match(/^(if|for|while|switch|try|catch)/)) {
        patterns.push(trimmed.split('(')[0]);
      }
      
      // Extract method calls
      const methodCalls = trimmed.match(/\w+\.\w+\(/g);
      if (methodCalls) {
        patterns.push(...methodCalls.map(call => call.replace('(', '')));
      }
    });
    
    return patterns.join('|');
  }

  /**
   * Calculate function complexity
   * @param {Array} functionBody - Function body lines
   * @returns {number} Complexity score
   */
  calculateComplexity(functionBody) {
    let complexity = 1; // Base complexity
    
    functionBody.forEach(line => {
      const trimmed = line.trim();
      
      // Add complexity for control structures
      if (trimmed.match(/^(if|for|while|switch|case)/)) complexity++;
      if (trimmed.match(/&&|\|\|/)) complexity++;
      if (trimmed.match(/catch|finally/)) complexity++;
    });
    
    return complexity;
  }

  /**
   * Analyze import patterns for duplicates
   * @param {Object} fileAnalysis - File analysis result
   * @returns {Array} Import patterns
   */
  analyzeImportPatterns(fileAnalysis) {
    const patterns = [];
    const allImports = [...fileAnalysis.imports, ...fileAnalysis.requires];
    
    // Group imports by module
    const moduleGroups = new Map();
    allImports.forEach(imp => {
      const module = imp.from || imp.module;
      if (!moduleGroups.has(module)) {
        moduleGroups.set(module, []);
      }
      moduleGroups.get(module).push({
        ...imp,
        filePath: fileAnalysis.relativePath
      });
    });
    
    // Find common import patterns
    moduleGroups.forEach((imports, module) => {
      if (imports.length > 0) {
        patterns.push({
          module: module,
          occurrences: imports,
          type: 'import',
          consolidationOpportunity: imports.length > 1
        });
      }
    });
    
    return patterns;
  }

  /**
   * Detect configuration patterns (CORS, middleware, etc.)
   * @param {Array} lines - File lines
   * @param {string} filePath - File path
   * @returns {Array} Configuration patterns
   */
  detectConfigurationPatterns(lines, filePath) {
    const patterns = [];
    const configPatterns = {
      cors: /cors\s*\(/,
      middleware: /app\.use\s*\(/,
      routes: /app\.(get|post|put|delete)\s*\(/,
      rateLimit: /rateLimit|rateLimiter/,
      database: /mongoose\.connect|connectToDatabase/,
      express: /express\(\)/
    };
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      Object.entries(configPatterns).forEach(([type, pattern]) => {
        if (pattern.test(trimmed)) {
          patterns.push({
            type: type,
            line: index + 1,
            content: trimmed,
            filePath: filePath,
            consolidationOpportunity: true
          });
        }
      });
    });
    
    return patterns;
  }

  /**
   * Find common patterns across all analyzed files
   * @returns {Array} Common patterns
   */
  findCommonPatterns() {
    const commonPatterns = [];
    const patternCounts = new Map();
    
    // Count pattern occurrences
    this.patterns.forEach((occurrences, pattern) => {
      if (occurrences.length > 1) {
        patternCounts.set(pattern, occurrences.length);
      }
    });
    
    // Sort by frequency
    const sortedPatterns = Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20); // Top 20 patterns
    
    sortedPatterns.forEach(([pattern, count]) => {
      commonPatterns.push({
        pattern: pattern,
        occurrences: count,
        files: this.patterns.get(pattern) || []
      });
    });
    
    return commonPatterns;
  }

  /**
   * Group similar code blocks
   * @param {Array} duplicateBlocks - Duplicate blocks
   * @returns {Array} Grouped blocks
   */
  groupSimilarBlocks(duplicateBlocks) {
    const grouped = [];
    const processed = new Set();
    
    duplicateBlocks.forEach(block => {
      if (processed.has(block.hash)) return;
      
      const similarBlocks = duplicateBlocks.filter(other => 
        other.hash === block.hash || 
        this.calculateSimilarity(block.pattern, other.pattern) > this.similarityThreshold
      );
      
      if (similarBlocks.length > 1) {
        grouped.push({
          id: crypto.randomUUID(),
          blocks: similarBlocks,
          consolidationPotential: 'high',
          estimatedSavings: similarBlocks.length * block.pattern.length
        });
        
        similarBlocks.forEach(b => processed.add(b.hash));
      }
    });
    
    return grouped;
  }

  /**
   * Group similar functions
   * @param {Array} functions - Function list
   * @returns {Array} Grouped functions
   */
  groupSimilarFunctions(functions) {
    const grouped = [];
    const processed = new Set();
    
    functions.forEach(func => {
      if (processed.has(func.name + func.filePath)) return;
      
      const similarFunctions = functions.filter(other => 
        func.signature === other.signature && 
        func.name !== other.name &&
        func.filePath !== other.filePath
      );
      
      if (similarFunctions.length > 0) {
        grouped.push({
          id: crypto.randomUUID(),
          functions: [func, ...similarFunctions],
          similarity: 'high',
          consolidationOpportunity: true,
          suggestedUtilityName: this.suggestUtilityName(func.name, similarFunctions)
        });
        
        [func, ...similarFunctions].forEach(f => 
          processed.add(f.name + f.filePath)
        );
      }
    });
    
    return grouped;
  }

  /**
   * Calculate similarity between two code patterns
   * @param {Array} pattern1 - First pattern
   * @param {Array} pattern2 - Second pattern
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(pattern1, pattern2) {
    if (!pattern1 || !pattern2) return 0;
    
    const str1 = pattern1.join('\n');
    const str2 = pattern2.join('\n');
    
    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} Distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Suggest utility name for similar functions
   * @param {string} baseName - Base function name
   * @param {Array} similarFunctions - Similar functions
   * @returns {string} Suggested utility name
   */
  suggestUtilityName(baseName, similarFunctions) {
    // Extract common words from function names
    const allNames = [baseName, ...similarFunctions.map(f => f.name)];
    const commonWords = this.findCommonWords(allNames);
    
    if (commonWords.length > 0) {
      return commonWords.join('') + 'Utility';
    }
    
    return baseName + 'Utility';
  }

  /**
   * Find common words in function names
   * @param {Array} names - Function names
   * @returns {Array} Common words
   */
  findCommonWords(names) {
    const wordSets = names.map(name => 
      name.replace(/([A-Z])/g, ' $1').toLowerCase().split(/\s+/)
    );
    
    const commonWords = wordSets[0].filter(word => 
      wordSets.every(set => set.includes(word))
    );
    
    return commonWords.filter(word => word.length > 2);
  }
}

module.exports = PatternDetector;