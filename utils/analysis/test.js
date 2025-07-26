/**
 * Test script for analysis infrastructure
 */

const { analyzeCodebase, FileAnalyzer, DependencyMapper, PatternDetector } = require('./index');
const path = require('path');

async function runTests() {
  console.log('🧪 Testing Analysis Infrastructure');
  console.log('=================================\n');

  try {
    // Test 1: FileAnalyzer
    console.log('1. Testing FileAnalyzer...');
    const fileAnalyzer = new FileAnalyzer();
    const testFile = path.join(__dirname, 'fileAnalyzer.js');
    const fileAnalysis = await fileAnalyzer.analyzeJSFile(testFile);
    console.log(`   ✅ Analyzed ${fileAnalysis.relativePath}`);
    console.log(`   📊 Found ${fileAnalysis.imports.length} imports, ${fileAnalysis.requires.length} requires`);
    console.log(`   📏 ${fileAnalysis.lineCount} lines, ${fileAnalysis.dependencies.length} dependencies\n`);

    // Test 2: DependencyMapper
    console.log('2. Testing DependencyMapper...');
    const dependencyMapper = new DependencyMapper();
    const testDir = path.join(__dirname);
    const depAnalysis = await dependencyMapper.buildDependencyGraph(testDir);
    console.log(`   ✅ Analyzed ${depAnalysis.summary.totalFiles} files`);
    console.log(`   🔗 Found ${depAnalysis.dependencies.relationships.circular.length} circular dependencies`);
    console.log(`   🗑️  Found ${depAnalysis.dependencies.unused.length} unused files\n`);

    // Test 3: PatternDetector
    console.log('3. Testing PatternDetector...');
    const patternDetector = new PatternDetector();
    const patternAnalysis = await patternDetector.detectPatterns(depAnalysis.files.javascript);
    console.log(`   ✅ Detected ${patternAnalysis.duplicateBlocks.length} duplicate blocks`);
    console.log(`   🔄 Found ${patternAnalysis.similarFunctions.length} similar functions`);
    console.log(`   ⚙️  Found ${patternAnalysis.duplicateConfigurations.length} configuration duplicates\n`);

    // Test 4: Complete Analysis
    console.log('4. Testing Complete Analysis...');
    const results = await analyzeCodebase(testDir, { saveResults: false });
    console.log(`   ✅ Complete analysis finished in ${results.metadata.analysisTime}ms`);
    console.log(`   📈 Code Health Score: ${results.metrics.codeHealth.score.toFixed(1)}/100`);
    console.log(`   🎯 Generated ${results.recommendations.priority.high.length} high priority recommendations\n`);

    console.log('🎉 All tests passed successfully!');
    
    return {
      success: true,
      results: {
        fileAnalysis: fileAnalysis.dependencies.length,
        dependencyAnalysis: depAnalysis.summary.totalFiles,
        patternAnalysis: patternAnalysis.duplicateBlocks.length,
        completeAnalysis: results.metadata.analysisTime
      }
    };

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    return { success: false, error: error.message };
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests().then(result => {
    if (!result.success) {
      process.exit(1);
    }
  });
}

module.exports = { runTests };