/**
 * Analysis Infrastructure - Main Export
 * Provides unified access to all analysis utilities
 */

const FileAnalyzer = require('./fileAnalyzer');
const DependencyMapper = require('./dependencyMapper');
const PatternDetector = require('./patternDetector');
const AnalysisOrchestrator = require('./analysisOrchestrator');

module.exports = {
  FileAnalyzer,
  DependencyMapper,
  PatternDetector,
  AnalysisOrchestrator,
  
  // Convenience function to run complete analysis
  async analyzeCodebase(rootPath, options = {}) {
    const orchestrator = new AnalysisOrchestrator();
    return await orchestrator.runCompleteAnalysis(rootPath, options);
  },
  
  // Convenience function to analyze specific files
  async analyzeFiles(filePaths) {
    const fileAnalyzer = new FileAnalyzer();
    const results = [];
    
    for (const filePath of filePaths) {
      const analysis = await fileAnalyzer.analyzeJSFile(filePath);
      results.push(analysis);
    }
    
    return results;
  },
  
  // Convenience function to detect patterns in specific files
  async detectPatterns(fileAnalysis) {
    const patternDetector = new PatternDetector();
    return await patternDetector.detectPatterns(fileAnalysis);
  },
  
  // Convenience function to build dependency graph
  async buildDependencyGraph(rootPath) {
    const dependencyMapper = new DependencyMapper();
    return await dependencyMapper.buildDependencyGraph(rootPath);
  }
};