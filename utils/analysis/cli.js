#!/usr/bin/env node

/**
 * CLI tool for running codebase analysis
 */

const AnalysisOrchestrator = require('./analysisOrchestrator');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const options = {
    saveResults: true,
    outputPath: './analysis-results.json'
  };

  // Parse command line arguments
  let targetPath = process.cwd();
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--path':
      case '-p':
        targetPath = args[i + 1];
        i++;
        break;
      case '--output':
      case '-o':
        options.outputPath = args[i + 1];
        i++;
        break;
      case '--no-save':
        options.saveResults = false;
        break;
      case '--help':
      case '-h':
        console.log(`
Usage: node cli.js [options]

Options:
  -p, --path <path>     Path to analyze (default: current directory)
  -o, --output <file>   Output file path (default: ./analysis-results.json)
  --no-save            Don't save results to file
  -h, --help           Show this help message

Examples:
  node cli.js                           # Analyze current directory
  node cli.js -p ./backend              # Analyze backend directory
  node cli.js -o ./reports/analysis.json # Save to custom location
        `);
        return;
    }
  }

  console.log('🔍 Codebase Analysis Tool');
  console.log('========================');
  console.log(`Target: ${path.resolve(targetPath)}`);
  console.log(`Output: ${options.saveResults ? options.outputPath : 'Console only'}`);
  console.log('');

  try {
    const orchestrator = new AnalysisOrchestrator();
    const results = await orchestrator.runCompleteAnalysis(targetPath, options);
    
    // Display summary
    console.log('\n📊 Analysis Summary');
    console.log('==================');
    console.log(`Files analyzed: ${results.summary.totalFiles}`);
    console.log(`JavaScript files: ${results.summary.jsFiles}`);
    console.log(`Markdown files: ${results.summary.mdFiles}`);
    console.log(`Unused files found: ${results.summary.unusedFiles}`);
    console.log(`Unused markdown files: ${results.summary.unusedMarkdownFiles || 0}`);
    console.log(`Broken markdown links: ${results.summary.brokenMarkdownLinks || 0}`);
    console.log(`Duplicate patterns: ${results.summary.duplicatePatterns}`);
    console.log(`Duplicate dependencies: ${results.summary.duplicateDependencies}`);
    
    // Display metrics
    console.log('\n📈 Health Metrics');
    console.log('=================');
    console.log(`Code Health: ${results.metrics.codeHealth.score.toFixed(1)}/100`);
    console.log(`Maintainability: ${results.metrics.maintainability.score.toFixed(1)}/100`);
    console.log(`Redundancy: ${results.metrics.redundancy.score.toFixed(1)}/100`);
    
    // Display top recommendations
    console.log('\n🎯 Top Recommendations');
    console.log('======================');
    
    const highPriority = results.recommendations.priority.high.slice(0, 3);
    if (highPriority.length > 0) {
      console.log('\nHigh Priority:');
      highPriority.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.action}`);
        console.log(`   Impact: ${rec.impact} | Savings: ${rec.estimatedSavings || 'N/A'}`);
      });
    }
    
    const mediumPriority = results.recommendations.priority.medium.slice(0, 3);
    if (mediumPriority.length > 0) {
      console.log('\nMedium Priority:');
      mediumPriority.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.action}`);
        console.log(`   Impact: ${rec.impact} | Savings: ${rec.estimatedSavings || 'N/A'}`);
      });
    }
    
    console.log('\n✅ Analysis completed successfully!');
    if (options.saveResults) {
      console.log(`📁 Detailed results saved to: ${options.outputPath}`);
    }
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };