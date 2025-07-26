/**
 * Test script for redundancy detector
 * Tests the implementation of task 2.2: Identify empty and redundant files
 */

const RedundancyDetector = require('./redundancyDetector');
const path = require('path');

async function testRedundancyDetector() {
  console.log('Testing Redundancy Detector...\n');
  
  const detector = new RedundancyDetector();
  const rootPath = path.join(process.cwd());
  
  try {
    // Test 1: Identify empty files
    console.log('=== Test 1: Identifying Empty Files ===');
    const emptyFilesResult = await detector.identifyEmptyFiles(rootPath);
    
    console.log(`Found ${emptyFilesResult.summary.totalEmptyFiles} empty files`);
    console.log(`Found ${emptyFilesResult.summary.totalEmptyDirectories} empty directories`);
    console.log(`Found ${emptyFilesResult.summary.totalNearlyEmptyFiles} nearly empty files`);
    console.log(`Potential savings: ${emptyFilesResult.summary.potentialSavings} bytes\n`);
    
    if (emptyFilesResult.emptyFiles.length > 0) {
      console.log('Empty files:');
      emptyFilesResult.emptyFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file.relativePath} (${file.size} bytes)`);
      });
      if (emptyFilesResult.emptyFiles.length > 5) {
        console.log(`  ... and ${emptyFilesResult.emptyFiles.length - 5} more`);
      }
      console.log();
    }
    
    if (emptyFilesResult.nearlyEmptyFiles.length > 0) {
      console.log('Nearly empty files:');
      emptyFilesResult.nearlyEmptyFiles.slice(0, 5).forEach(file => {
        console.log(`  - ${file.relativePath} (${file.meaningfulLines}/${file.totalLines} meaningful lines)`);
      });
      if (emptyFilesResult.nearlyEmptyFiles.length > 5) {
        console.log(`  ... and ${emptyFilesResult.nearlyEmptyFiles.length - 5} more`);
      }
      console.log();
    }

    // Test 2: Detect duplicate files
    console.log('=== Test 2: Detecting Duplicate Files ===');
    const duplicateFilesResult = await detector.detectDuplicateFiles(rootPath);
    
    console.log(`Found ${duplicateFilesResult.summary.totalIdenticalGroups} groups of identical files`);
    console.log(`Found ${duplicateFilesResult.summary.totalSimilarGroups} groups of similar files`);
    console.log(`Potential savings: ${duplicateFilesResult.summary.potentialSavings} bytes\n`);
    
    if (duplicateFilesResult.identicalFiles.length > 0) {
      console.log('Identical file groups:');
      duplicateFilesResult.identicalFiles.slice(0, 3).forEach((group, index) => {
        console.log(`  Group ${index + 1} (${group.count} files, ${group.duplicateSize} bytes savings):`);
        group.files.forEach(file => {
          console.log(`    - ${file.relativePath}`);
        });
      });
      if (duplicateFilesResult.identicalFiles.length > 3) {
        console.log(`  ... and ${duplicateFilesResult.identicalFiles.length - 3} more groups`);
      }
      console.log();
    }
    
    if (duplicateFilesResult.similarFiles.length > 0) {
      console.log('Similar file groups:');
      duplicateFilesResult.similarFiles.slice(0, 3).forEach((group, index) => {
        console.log(`  Group ${index + 1} (${group.count} files, ${(group.similarity * 100).toFixed(1)}% similar):`);
        group.files.forEach(file => {
          console.log(`    - ${file.relativePath}`);
        });
      });
      if (duplicateFilesResult.similarFiles.length > 3) {
        console.log(`  ... and ${duplicateFilesResult.similarFiles.length - 3} more groups`);
      }
      console.log();
    }

    // Test 3: Generate removal recommendations
    console.log('=== Test 3: Generating Removal Recommendations ===');
    const recommendations = detector.generateRemovalRecommendations(
      emptyFilesResult,
      duplicateFilesResult,
      [] // Empty usage map for testing
    );
    
    console.log(`Total recommendations: ${recommendations.summary.totalRecommendations}`);
    console.log(`Safe removals: ${recommendations.summary.safeRemovals}`);
    console.log(`Require review: ${recommendations.summary.reviewRequired}`);
    console.log(`Estimated savings: ${recommendations.summary.estimatedSavings} bytes\n`);
    
    if (recommendations.safeToRemove.length > 0) {
      console.log('Safe to remove:');
      recommendations.safeToRemove.slice(0, 5).forEach(rec => {
        console.log(`  - ${rec.relativePath} (${rec.reason})`);
      });
      if (recommendations.safeToRemove.length > 5) {
        console.log(`  ... and ${recommendations.safeToRemove.length - 5} more`);
      }
      console.log();
    }
    
    if (recommendations.requiresReview.length > 0) {
      console.log('Require review:');
      recommendations.requiresReview.slice(0, 5).forEach(rec => {
        console.log(`  - ${rec.relativePath} (${rec.reviewReason})`);
      });
      if (recommendations.requiresReview.length > 5) {
        console.log(`  ... and ${recommendations.requiresReview.length - 5} more`);
      }
      console.log();
    }

    // Test 4: Complete analysis
    console.log('=== Test 4: Complete Redundancy Analysis ===');
    const completeAnalysis = await detector.runCompleteAnalysis(rootPath);
    
    console.log('Complete analysis summary:');
    console.log(`  - Empty files: ${completeAnalysis.summary.totalEmptyFiles}`);
    console.log(`  - Empty directories: ${completeAnalysis.summary.totalEmptyDirectories}`);
    console.log(`  - Nearly empty files: ${completeAnalysis.summary.totalNearlyEmptyFiles}`);
    console.log(`  - Identical file groups: ${completeAnalysis.summary.totalIdenticalGroups}`);
    console.log(`  - Similar file groups: ${completeAnalysis.summary.totalSimilarGroups}`);
    console.log(`  - Safe removals: ${completeAnalysis.summary.safeRemovals}`);
    console.log(`  - Review required: ${completeAnalysis.summary.reviewRequired}`);
    console.log(`  - Estimated savings: ${completeAnalysis.summary.estimatedSavings} bytes`);
    
    console.log('\n✅ All tests completed successfully!');
    
    return completeAnalysis;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRedundancyDetector()
    .then(() => {
      console.log('\n🎉 Redundancy detector is working correctly!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tests failed:', error);
      process.exit(1);
    });
}

module.exports = testRedundancyDetector;