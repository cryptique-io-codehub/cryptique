/**
 * Analysis Orchestrator
 * Coordinates all analysis utilities and provides a unified interface
 */

const FileAnalyzer = require('./fileAnalyzer');
const DependencyMapper = require('./dependencyMapper');
const PatternDetector = require('./patternDetector');
const RedundancyDetector = require('./redundancyDetector');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

class AnalysisOrchestrator {
  constructor() {
    this.fileAnalyzer = new FileAnalyzer();
    this.dependencyMapper = new DependencyMapper();
    this.patternDetector = new PatternDetector();
    this.redundancyDetector = new RedundancyDetector();
    this.analysisResults = null;
  }

  /**
   * Run complete codebase analysis
   * @param {string} rootPath - Root directory to analyze
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Complete analysis results
   */
  async runCompleteAnalysis(rootPath = process.cwd(), options = {}) {
    console.log('Starting complete codebase analysis...');
    console.log(`Analyzing directory: ${rootPath}`);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Build dependency graph
      console.log('\n1. Building dependency graph...');
      const dependencyAnalysis = await this.dependencyMapper.buildDependencyGraph(rootPath);
      
      // Step 2: Detect patterns
      console.log('\n2. Detecting code patterns...');
      const patternAnalysis = await this.patternDetector.detectPatterns(
        dependencyAnalysis.files.javascript
      );
      
      // Step 2.5: Analyze redundancy (empty and duplicate files)
      console.log('\n2.5. Analyzing redundancy...');
      const redundancyAnalysis = await this.redundancyDetector.runCompleteAnalysis(
        rootPath,
        dependencyAnalysis.dependencies.unused
      );
      
      // Step 3: Generate recommendations
      console.log('\n3. Generating recommendations...');
      const recommendations = this.generateRecommendations(
        dependencyAnalysis, 
        patternAnalysis,
        redundancyAnalysis
      );
      
      // Step 4: Calculate metrics
      console.log('\n4. Calculating metrics...');
      const metrics = this.calculateMetrics(dependencyAnalysis, patternAnalysis);
      
      // Compile final results
      this.analysisResults = {
        metadata: {
          timestamp: new Date().toISOString(),
          analysisTime: Date.now() - startTime,
          rootPath: rootPath,
          version: '1.0.0'
        },
        summary: {
          ...dependencyAnalysis.summary,
          duplicatePatterns: patternAnalysis.duplicateBlocks.length,
          similarFunctions: patternAnalysis.similarFunctions.length,
          configurationDuplicates: patternAnalysis.duplicateConfigurations.length,
          ...redundancyAnalysis.summary
        },
        dependencies: dependencyAnalysis.dependencies,
        patterns: patternAnalysis,
        redundancy: redundancyAnalysis,
        recommendations: recommendations,
        metrics: metrics,
        files: dependencyAnalysis.files
      };
      
      console.log(`\nAnalysis completed in ${this.analysisResults.metadata.analysisTime}ms`);
      
      // Save results if requested
      if (options.saveResults) {
        await this.saveResults(options.outputPath);
      }
      
      return this.analysisResults;
      
    } catch (error) {
      console.error('Error during analysis:', error);
      throw error;
    }
  }

  /**
   * Generate actionable recommendations based on analysis
   * @param {Object} dependencyAnalysis - Dependency analysis results
   * @param {Object} patternAnalysis - Pattern analysis results
   * @param {Object} redundancyAnalysis - Redundancy analysis results
   * @returns {Object} Recommendations
   */
  generateRecommendations(dependencyAnalysis, patternAnalysis, redundancyAnalysis) {
    const recommendations = {
      filesToRemove: [],
      codesToConsolidate: [],
      utilitiesToCreate: [],
      dependenciesToCleanup: [],
      configurationsToUnify: [],
      markdownCleanup: [],
      priority: {
        high: [],
        medium: [],
        low: []
      }
    };

    // Files to remove from dependency analysis
    dependencyAnalysis.dependencies.unused.forEach(file => {
      const rec = {
        type: 'remove-file',
        target: file.path,
        reason: file.reason,
        impact: 'low',
        estimatedSavings: `${file.size} lines`,
        action: `Remove unused file: ${file.path}`
      };
      
      recommendations.filesToRemove.push(rec);
      recommendations.priority.low.push(rec);
    });

    // Files to remove from redundancy analysis
    redundancyAnalysis.recommendations.safeToRemove.forEach(file => {
      const rec = {
        type: file.type,
        target: file.path,
        reason: file.reason,
        impact: 'low',
        estimatedSavings: `${file.size} bytes`,
        action: `Remove ${file.type.replace('-', ' ')}: ${file.relativePath}`,
        safety: file.safety
      };
      
      recommendations.filesToRemove.push(rec);
      recommendations.priority.low.push(rec);
    });

    // Files requiring review from redundancy analysis
    redundancyAnalysis.recommendations.requiresReview.forEach(file => {
      const rec = {
        type: file.type,
        target: file.path,
        reason: file.reason,
        reviewReason: file.reviewReason,
        impact: 'medium',
        estimatedSavings: `${file.size} bytes`,
        action: `Review and potentially remove: ${file.relativePath}`,
        safety: file.safety,
        isReferenced: file.isReferenced,
        importCount: file.importCount
      };
      
      recommendations.filesToRemove.push(rec);
      recommendations.priority.medium.push(rec);
    });

    // Code consolidation opportunities
    patternAnalysis.duplicateBlocks.forEach(blockGroup => {
      if (blockGroup.blocks && blockGroup.blocks.length > 1) {
        const rec = {
          type: 'consolidate-code',
          pattern: blockGroup.blocks[0].pattern.slice(0, 2).join('\n'),
          occurrences: blockGroup.blocks.length,
          files: blockGroup.blocks.map(b => b.filePath),
          impact: 'medium',
          estimatedSavings: `${blockGroup.estimatedSavings} lines`,
          action: `Create utility function for duplicate code pattern`
        };
        
        recommendations.codesToConsolidate.push(rec);
        recommendations.priority.medium.push(rec);
      }
    });

    // Similar functions to consolidate
    patternAnalysis.similarFunctions.forEach(funcGroup => {
      if (funcGroup.functions && funcGroup.functions.length > 1) {
        const rec = {
          type: 'consolidate-functions',
          functions: funcGroup.functions.map(f => ({
            name: f.name,
            file: f.filePath,
            complexity: f.complexity
          })),
          suggestedUtilityName: funcGroup.suggestedUtilityName,
          impact: 'high',
          estimatedSavings: `${funcGroup.functions.length - 1} duplicate functions`,
          action: `Create ${funcGroup.suggestedUtilityName} utility function`
        };
        
        recommendations.utilitiesToCreate.push(rec);
        recommendations.priority.high.push(rec);
      }
    });

    // Dependency cleanup
    dependencyAnalysis.dependencies.duplicates.forEach(duplicate => {
      const rec = {
        type: 'cleanup-dependency',
        dependency: duplicate.name,
        occurrences: duplicate.occurrences.length,
        versionConflict: duplicate.versionConflict,
        versions: duplicate.versions,
        impact: duplicate.versionConflict ? 'high' : 'medium',
        action: `Consolidate ${duplicate.name} dependency across packages`
      };
      
      recommendations.dependenciesToCleanup.push(rec);
      
      if (duplicate.versionConflict) {
        recommendations.priority.high.push(rec);
      } else {
        recommendations.priority.medium.push(rec);
      }
    });

    // Configuration unification
    const configGroups = this.groupConfigurationPatterns(patternAnalysis.duplicateConfigurations);
    configGroups.forEach(group => {
      if (group.occurrences.length > 1) {
        const rec = {
          type: 'unify-configuration',
          configType: group.type,
          occurrences: group.occurrences.length,
          files: group.occurrences.map(c => c.filePath),
          impact: 'high',
          action: `Create centralized ${group.type} configuration`
        };
        
        recommendations.configurationsToUnify.push(rec);
        recommendations.priority.high.push(rec);
      }
    });

    // Markdown cleanup recommendations
    if (dependencyAnalysis.files.markdown && dependencyAnalysis.files.markdown.recommendations) {
      const markdownRecs = dependencyAnalysis.files.markdown.recommendations;
      
      // Files to remove
      markdownRecs.filesToRemove.forEach(file => {
        const rec = {
          type: 'remove-markdown',
          target: file.path,
          reason: file.reason,
          impact: file.safety === 'safe' ? 'low' : 'medium',
          action: `Remove ${file.reason.replace('_', ' ')} markdown file: ${path.basename(file.path)}`,
          safety: file.safety
        };
        
        recommendations.markdownCleanup.push(rec);
        
        if (file.safety === 'safe') {
          recommendations.priority.low.push(rec);
        } else {
          recommendations.priority.medium.push(rec);
        }
      });
      
      // Links to fix
      markdownRecs.linksToFix.forEach(link => {
        const rec = {
          type: 'fix-markdown-link',
          target: link.file,
          issue: link.issue,
          impact: 'medium',
          action: `Fix broken link in ${path.basename(link.file)}`,
          priority: link.priority
        };
        
        recommendations.markdownCleanup.push(rec);
        recommendations.priority.medium.push(rec);
      });
      
      // Files to update
      markdownRecs.filesToUpdate.forEach(file => {
        const rec = {
          type: 'update-markdown',
          target: file.path,
          reason: file.reason,
          impact: 'low',
          action: `Review and update outdated markdown: ${path.basename(file.path)}`,
          lastModified: file.lastModified
        };
        
        recommendations.markdownCleanup.push(rec);
        recommendations.priority.low.push(rec);
      });
    }

    return recommendations;
  }

  /**
   * Group configuration patterns by type
   * @param {Array} configurations - Configuration patterns
   * @returns {Array} Grouped configurations
   */
  groupConfigurationPatterns(configurations) {
    const groups = new Map();
    
    configurations.forEach(config => {
      if (!groups.has(config.type)) {
        groups.set(config.type, {
          type: config.type,
          occurrences: []
        });
      }
      groups.get(config.type).occurrences.push(config);
    });
    
    return Array.from(groups.values());
  }

  /**
   * Calculate analysis metrics
   * @param {Object} dependencyAnalysis - Dependency analysis
   * @param {Object} patternAnalysis - Pattern analysis
   * @returns {Object} Metrics
   */
  calculateMetrics(dependencyAnalysis, patternAnalysis) {
    const metrics = {
      codeHealth: {
        score: 0,
        factors: {}
      },
      maintainability: {
        score: 0,
        factors: {}
      },
      redundancy: {
        score: 0,
        factors: {}
      },
      complexity: {
        averageFunctionComplexity: 0,
        highComplexityFunctions: 0
      },
      dependencies: {
        totalDependencies: 0,
        duplicateDependencies: 0,
        unusedFiles: 0
      }
    };

    // Calculate code health score
    const totalFiles = dependencyAnalysis.summary.jsFiles;
    const unusedFiles = dependencyAnalysis.dependencies.unused.length;
    const duplicateBlocks = patternAnalysis.duplicateBlocks.length;
    
    metrics.codeHealth.factors.unusedFileRatio = unusedFiles / totalFiles;
    metrics.codeHealth.factors.duplicateBlockRatio = duplicateBlocks / totalFiles;
    metrics.codeHealth.score = Math.max(0, 100 - (
      (metrics.codeHealth.factors.unusedFileRatio * 30) +
      (metrics.codeHealth.factors.duplicateBlockRatio * 40)
    ));

    // Calculate maintainability score
    const circularDeps = dependencyAnalysis.dependencies.relationships.circular.length;
    const orphanedFiles = dependencyAnalysis.dependencies.relationships.orphaned.length;
    
    metrics.maintainability.factors.circularDependencies = circularDeps;
    metrics.maintainability.factors.orphanedFiles = orphanedFiles;
    metrics.maintainability.score = Math.max(0, 100 - (
      (circularDeps * 10) +
      (orphanedFiles * 5)
    ));

    // Calculate redundancy score
    const duplicateDeps = dependencyAnalysis.dependencies.duplicates.length;
    const configDuplicates = patternAnalysis.duplicateConfigurations.length;
    
    metrics.redundancy.factors.duplicateDependencies = duplicateDeps;
    metrics.redundancy.factors.configurationDuplicates = configDuplicates;
    metrics.redundancy.score = Math.max(0, 100 - (
      (duplicateDeps * 5) +
      (configDuplicates * 3)
    ));

    // Calculate complexity metrics
    const allFunctions = patternAnalysis.similarFunctions.flat();
    if (allFunctions.length > 0) {
      const totalComplexity = allFunctions.reduce((sum, func) => sum + (func.complexity || 1), 0);
      metrics.complexity.averageFunctionComplexity = totalComplexity / allFunctions.length;
      metrics.complexity.highComplexityFunctions = allFunctions.filter(f => (f.complexity || 1) > 10).length;
    }

    // Dependency metrics
    metrics.dependencies.totalDependencies = dependencyAnalysis.dependencies.duplicates.reduce(
      (sum, dep) => sum + dep.occurrences.length, 0
    );
    metrics.dependencies.duplicateDependencies = duplicateDeps;
    metrics.dependencies.unusedFiles = unusedFiles;

    return metrics;
  }

  /**
   * Save analysis results to file
   * @param {string} outputPath - Output file path
   */
  async saveResults(outputPath = './analysis-results.json') {
    try {
      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await mkdir(outputDir, { recursive: true });
      
      // Save main results
      await writeFile(outputPath, JSON.stringify(this.analysisResults, null, 2));
      console.log(`Analysis results saved to: ${outputPath}`);
      
      // Save summary report
      const summaryPath = outputPath.replace('.json', '-summary.json');
      const summary = {
        metadata: this.analysisResults.metadata,
        summary: this.analysisResults.summary,
        metrics: this.analysisResults.metrics,
        topRecommendations: {
          high: this.analysisResults.recommendations.priority.high.slice(0, 5),
          medium: this.analysisResults.recommendations.priority.medium.slice(0, 5)
        }
      };
      
      await writeFile(summaryPath, JSON.stringify(summary, null, 2));
      console.log(`Analysis summary saved to: ${summaryPath}`);
      
    } catch (error) {
      console.error('Error saving results:', error);
      throw error;
    }
  }

  /**
   * Get analysis results
   * @returns {Object} Analysis results
   */
  getResults() {
    return this.analysisResults;
  }

  /**
   * Get specific analysis section
   * @param {string} section - Section name
   * @returns {Object} Section data
   */
  getSection(section) {
    return this.analysisResults ? this.analysisResults[section] : null;
  }

  /**
   * Get recommendations by priority
   * @param {string} priority - Priority level (high, medium, low)
   * @returns {Array} Recommendations
   */
  getRecommendationsByPriority(priority) {
    return this.analysisResults ? 
      this.analysisResults.recommendations.priority[priority] || [] : [];
  }

  /**
   * Generate human-readable report
   * @returns {string} Report text
   */
  generateReport() {
    if (!this.analysisResults) {
      return 'No analysis results available. Run analysis first.';
    }

    const { summary, metrics, recommendations } = this.analysisResults;
    
    let report = `
# Codebase Analysis Report

## Summary
- Total Files: ${summary.totalFiles}
- JavaScript Files: ${summary.jsFiles}
- Package Files: ${summary.packageFiles}
- Unused Files: ${summary.unusedFiles}
- Duplicate Dependencies: ${summary.duplicateDependencies}
- Duplicate Patterns: ${summary.duplicatePatterns}

## Health Metrics
- Code Health Score: ${metrics.codeHealth.score.toFixed(1)}/100
- Maintainability Score: ${metrics.maintainability.score.toFixed(1)}/100
- Redundancy Score: ${metrics.redundancy.score.toFixed(1)}/100

## Top Recommendations

### High Priority (${recommendations.priority.high.length})
${recommendations.priority.high.slice(0, 5).map(rec => 
  `- ${rec.action} (Impact: ${rec.impact})`
).join('\n')}

### Medium Priority (${recommendations.priority.medium.length})
${recommendations.priority.medium.slice(0, 5).map(rec => 
  `- ${rec.action} (Impact: ${rec.impact})`
).join('\n')}

## Next Steps
1. Address high priority recommendations first
2. Focus on code consolidation opportunities
3. Remove unused files and dependencies
4. Unify duplicate configurations

Generated on: ${this.analysisResults.metadata.timestamp}
Analysis time: ${this.analysisResults.metadata.analysisTime}ms
`;

    return report;
  }
}

module.exports = AnalysisOrchestrator;