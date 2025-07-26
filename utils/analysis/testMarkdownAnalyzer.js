/**
 * Test script for Markdown Analyzer
 */

const MarkdownAnalyzer = require('./markdownAnalyzer');
const path = require('path');

async function testMarkdownAnalyzer() {
  console.log('Testing Markdown Analyzer...\n');
  
  const analyzer = new MarkdownAnalyzer();
  const rootPath = process.cwd();
  
  try {
    // Find all markdown files in the project
    const fs = require('fs');
    const { promisify } = require('util');
    const readdir = promisify(fs.readdir);
    const stat = promisify(fs.stat);
    
    async function findMarkdownFiles(dir, files = []) {
      const items = await readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stats = await stat(fullPath);
        
        // Skip node_modules and other ignored directories
        if (fullPath.includes('node_modules') || fullPath.includes('.git')) {
          continue;
        }
        
        if (stats.isDirectory()) {
          await findMarkdownFiles(fullPath, files);
        } else if (stats.isFile() && path.extname(fullPath) === '.md') {
          files.push({
            path: fullPath,
            name: path.basename(fullPath),
            relativePath: path.relative(rootPath, fullPath)
          });
        }
      }
      
      return files;
    }
    
    console.log('1. Finding markdown files...');
    const markdownFiles = await findMarkdownFiles(rootPath);
    console.log(`Found ${markdownFiles.length} markdown files:`);
    markdownFiles.forEach(file => console.log(`  - ${file.relativePath}`));
    
    if (markdownFiles.length === 0) {
      console.log('No markdown files found to analyze.');
      return;
    }
    
    console.log('\n2. Analyzing individual files...');
    for (const file of markdownFiles.slice(0, 3)) { // Test first 3 files
      console.log(`\nAnalyzing: ${file.relativePath}`);
      const analysis = await analyzer.analyzeMarkdownFile(file.path);
      
      console.log(`  - Size: ${analysis.size} bytes`);
      console.log(`  - Lines: ${analysis.lineCount}`);
      console.log(`  - Words: ${analysis.wordCount}`);
      console.log(`  - Empty: ${analysis.isEmpty}`);
      console.log(`  - Links: ${analysis.links.length}`);
      console.log(`  - References: ${analysis.references.length}`);
      console.log(`  - Sections: ${analysis.sections.length}`);
      
      if (analysis.links.length > 0) {
        console.log('  Links found:');
        analysis.links.slice(0, 3).forEach(link => {
          console.log(`    - [${link.text}](${link.url}) - ${link.type} - Local: ${link.isLocal}`);
        });
      }
      
      if (analysis.sections.length > 0) {
        console.log('  Sections:');
        analysis.sections.slice(0, 3).forEach(section => {
          console.log(`    - ${'#'.repeat(section.level)} ${section.title}`);
        });
      }
    }
    
    console.log('\n3. Running complete markdown analysis...');
    const completeAnalysis = await analyzer.analyzeMarkdownFiles(markdownFiles, rootPath);
    
    console.log('\nMarkdown Analysis Summary:');
    console.log(`  - Total files: ${completeAnalysis.summary.totalFiles}`);
    console.log(`  - Empty files: ${completeAnalysis.summary.emptyFiles}`);
    console.log(`  - Files with links: ${completeAnalysis.summary.filesWithLinks}`);
    console.log(`  - Files with references: ${completeAnalysis.summary.filesWithReferences}`);
    console.log(`  - Unused files: ${completeAnalysis.summary.unusedFiles}`);
    console.log(`  - Broken links: ${completeAnalysis.summary.brokenLinks}`);
    console.log(`  - Outdated files: ${completeAnalysis.summary.outdatedFiles}`);
    
    if (completeAnalysis.issues.unused.length > 0) {
      console.log('\nUnused markdown files:');
      completeAnalysis.issues.unused.forEach(file => {
        console.log(`  - ${file.path} (${file.reason})`);
      });
    }
    
    if (completeAnalysis.issues.broken.length > 0) {
      console.log('\nBroken links found:');
      completeAnalysis.issues.broken.slice(0, 5).forEach(broken => {
        const linkInfo = broken.link || broken.reference;
        console.log(`  - ${broken.file}: ${linkInfo.url || linkInfo.fileName} (${broken.error})`);
      });
    }
    
    if (completeAnalysis.issues.outdated.length > 0) {
      console.log('\nOutdated files:');
      completeAnalysis.issues.outdated.forEach(file => {
        console.log(`  - ${file.path} (${file.reason}, ${file.wordCount} words)`);
      });
    }
    
    console.log('\nRecommendations:');
    const recs = completeAnalysis.recommendations;
    console.log(`  - Files to remove: ${recs.filesToRemove.length}`);
    console.log(`  - Links to fix: ${recs.linksToFix.length}`);
    console.log(`  - Files to update: ${recs.filesToUpdate.length}`);
    console.log(`  - High priority: ${recs.priority.high.length}`);
    console.log(`  - Medium priority: ${recs.priority.medium.length}`);
    console.log(`  - Low priority: ${recs.priority.low.length}`);
    
    if (recs.priority.high.length > 0) {
      console.log('\nHigh priority recommendations:');
      recs.priority.high.slice(0, 3).forEach(rec => {
        console.log(`  - ${rec.description}`);
      });
    }
    
    console.log('\n✅ Markdown analyzer test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during markdown analysis test:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testMarkdownAnalyzer().catch(console.error);
}

module.exports = testMarkdownAnalyzer;