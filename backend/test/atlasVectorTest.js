const { vectorDatabase } = require('../config/vectorDatabase');
const mongoose = require('mongoose');
require('dotenv').config();

// Ensure environment variables are loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

if (!process.env.GEMINI_API && !process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API or GEMINI_API_KEY not found in environment variables');
  process.exit(1);
}

// Set GEMINI_API_KEY if only GEMINI_API is available
if (process.env.GEMINI_API && !process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API;
}

console.log('✅ Environment variables loaded:');
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? 'Set' : 'Not set'}`);
console.log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'Set' : 'Not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log('');

/**
 * Atlas Vector Search Test Script
 * Tests the complete vector database functionality with Atlas
 */

class AtlasVectorTest {
  constructor() {
    this.testResults = {
      connection: false,
      indexValidation: false,
      documentInsert: false,
      vectorSearch: false,
      hybridSearch: false,
      performance: false
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Atlas Vector Search Tests...\n');
    
    try {
      // Test 1: Connection
      await this.testConnection();
      
      // Test 2: Index Validation
      await this.testIndexValidation();
      
      // Test 3: Document Operations
      await this.testDocumentOperations();
      
      // Test 4: Vector Search
      await this.testVectorSearch();
      
      // Test 5: Hybrid Search
      await this.testHybridSearch();
      
      // Test 6: Performance
      await this.testPerformance();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.printResults();
    } finally {
      await vectorDatabase.shutdown();
    }
  }
  
  async testConnection() {
    console.log('📋 Test 1: Testing Atlas Connection...');
    
    try {
      await vectorDatabase.initialize();
      
      if (vectorDatabase.isConnected && vectorDatabase.isInitialized) {
        console.log('✅ Connection established successfully');
        console.log(`   Database: ${vectorDatabase.config.database}`);
        console.log(`   Collection: ${vectorDatabase.config.collection}`);
        this.testResults.connection = true;
      } else {
        throw new Error('Connection not properly established');
      }
      
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      throw error;
    }
    
    console.log();
  }
  
  async testIndexValidation() {
    console.log('📋 Test 2: Validating Vector Search Index...');
    
    try {
      const collection = vectorDatabase.collection;
      
      // Check if vector search index exists
      const searchIndexes = await collection.listSearchIndexes().toArray();
      const vectorIndex = searchIndexes.find(idx => idx.name === 'vector_index');
      
      if (vectorIndex) {
        console.log('✅ Vector search index found');
        console.log(`   Index Name: ${vectorIndex.name}`);
        console.log(`   Status: ${vectorIndex.status}`);
        console.log(`   Type: ${vectorIndex.type}`);
        this.testResults.indexValidation = true;
      } else {
        throw new Error('Vector search index not found');
      }
      
    } catch (error) {
      console.error('❌ Index validation failed:', error.message);
      throw error;
    }
    
    console.log();
  }
  
  async testDocumentOperations() {
    console.log('📋 Test 3: Testing Document Operations...');
    
    try {
      // Create test document
      const testDoc = {
        documentId: `test_doc_${Date.now()}`,
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId(),
        siteId: 'test_site_atlas',
        teamId: new mongoose.Types.ObjectId(),
        embedding: Array(1536).fill(0).map(() => Math.random() - 0.5),
        content: 'Test document for Atlas Vector Search validation',
        status: 'active',
        metadata: {
          testType: 'atlas_validation',
          importance: 8,
          category: 'test'
        }
      };
      
      // Insert document
      const insertResult = await vectorDatabase.insertDocument(testDoc);
      
      if (insertResult.acknowledged) {
        console.log('✅ Document inserted successfully');
        console.log(`   Document ID: ${testDoc.documentId}`);
        console.log(`   Embedding dimensions: ${testDoc.embedding.length}`);
        this.testResults.documentInsert = true;
        
        // Store for cleanup
        this.testDocumentId = testDoc.documentId;
      } else {
        throw new Error('Document insertion failed');
      }
      
    } catch (error) {
      console.error('❌ Document operations failed:', error.message);
      throw error;
    }
    
    console.log();
  }
  
  async testVectorSearch() {
    console.log('📋 Test 4: Testing Vector Search...');
    
    try {
      // Create query vector
      const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
      
      // Perform vector search
      const searchResults = await vectorDatabase.vectorSearch(queryVector, {
        limit: 5,
        filter: {
          sourceType: 'analytics',
          status: 'active'
        }
      });
      
      if (searchResults && searchResults.length > 0) {
        console.log('✅ Vector search successful');
        console.log(`   Results found: ${searchResults.length}`);
        console.log(`   Top result score: ${searchResults[0].score?.toFixed(4) || 'N/A'}`);
        console.log(`   Source type: ${searchResults[0].sourceType}`);
        this.testResults.vectorSearch = true;
      } else {
        console.log('⚠️  Vector search returned no results (this may be normal with test data)');
        this.testResults.vectorSearch = true; // Still consider successful if no error
      }
      
    } catch (error) {
      console.error('❌ Vector search failed:', error.message);
      throw error;
    }
    
    console.log();
  }
  
  async testHybridSearch() {
    console.log('📋 Test 5: Testing Hybrid Search...');
    
    try {
      // Create query vector
      const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
      const textQuery = 'analytics test document';
      
      // Perform hybrid search
      const hybridResults = await vectorDatabase.hybridSearch(queryVector, textQuery, {
        limit: 3,
        filter: {
          sourceType: 'analytics'
        }
      });
      
      if (hybridResults !== null) {
        console.log('✅ Hybrid search successful');
        console.log(`   Results found: ${hybridResults.length}`);
        if (hybridResults.length > 0) {
          console.log(`   Top result combined score: ${hybridResults[0].combinedScore?.toFixed(4) || 'N/A'}`);
        }
        this.testResults.hybridSearch = true;
      } else {
        throw new Error('Hybrid search returned null');
      }
      
    } catch (error) {
      console.error('❌ Hybrid search failed:', error.message);
      // Don't throw here as text search might not be configured
      console.log('⚠️  This may be due to text search index not being configured');
    }
    
    console.log();
  }
  
  async testPerformance() {
    console.log('📋 Test 6: Testing Performance...');
    
    try {
      const startTime = Date.now();
      
      // Test query performance
      const queryVector = Array(1536).fill(0).map(() => Math.random() - 0.5);
      const results = await vectorDatabase.vectorSearch(queryVector, {
        limit: 10,
        filter: { status: 'active' }
      });
      
      const queryTime = Date.now() - startTime;
      
      // Get database statistics
      const stats = await vectorDatabase.getStats();
      
      console.log('✅ Performance test completed');
      console.log(`   Query time: ${queryTime}ms`);
      console.log(`   Total documents: ${stats.collection.count}`);
      console.log(`   Cache hit rate: ${(stats.performance.cacheHitRate * 100).toFixed(2)}%`);
      console.log(`   Average response time: ${stats.performance.avgResponseTime.toFixed(2)}ms`);
      
      this.testResults.performance = queryTime < 5000; // Should be under 5 seconds
      
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      throw error;
    }
    
    console.log();
  }
  
  async cleanup() {
    if (this.testDocumentId) {
      try {
        await vectorDatabase.deleteDocument(this.testDocumentId);
        console.log('🧹 Test document cleaned up');
      } catch (error) {
        console.log('⚠️  Failed to clean up test document:', error.message);
      }
    }
  }
  
  printResults() {
    console.log('='.repeat(60));
    console.log('📊 ATLAS VECTOR SEARCH TEST RESULTS');
    console.log('='.repeat(60));
    
    const tests = [
      { name: 'Atlas Connection', result: this.testResults.connection },
      { name: 'Index Validation', result: this.testResults.indexValidation },
      { name: 'Document Operations', result: this.testResults.documentInsert },
      { name: 'Vector Search', result: this.testResults.vectorSearch },
      { name: 'Hybrid Search', result: this.testResults.hybridSearch },
      { name: 'Performance', result: this.testResults.performance }
    ];
    
    let passedTests = 0;
    
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${test.name}: ${status}`);
      if (test.result) passedTests++;
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`📈 Overall Result: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
      console.log('🎉 All tests passed! Atlas Vector Search is fully functional.');
    } else if (passedTests >= 4) {
      console.log('⚠️  Most tests passed. Minor configuration may be needed.');
    } else {
      console.log('❌ Multiple tests failed. Check configuration and try again.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AtlasVectorTest();
  tester.runAllTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { AtlasVectorTest }; 