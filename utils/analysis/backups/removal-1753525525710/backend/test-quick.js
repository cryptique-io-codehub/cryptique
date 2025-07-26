const { VectorDatabase } = require('./config/vectorDatabase');

async function quickTest() {
  console.log('🧪 Quick Vector Database Test');
  
  const vectorDb = new VectorDatabase({
    uri: process.env.MONGODB_URI,
    database: process.env.MONGODB_DATABASE,
    collection: 'test_vectordocuments'
  });
  
  try {
    // Test 1: Initialize
    console.log('1. Testing initialization...');
    await vectorDb.initialize();
    console.log('✅ Initialization successful');
    
    // Test 2: Get Stats
    console.log('2. Testing getStats...');
    const stats = await vectorDb.getStats();
    console.log('✅ getStats successful:', {
      database: stats.database.name,
      collection: stats.collection.name,
      count: stats.collection.count,
      indexCount: stats.collection.indexCount
    });
    
    // Test 3: Circuit Breaker
    console.log('3. Testing circuit breaker...');
    console.log('Initial state:', vectorDb.circuitBreaker.state);
    
    // Reset circuit breaker
    vectorDb.circuitBreaker.state = 'CLOSED';
    vectorDb.circuitBreaker.failures = 0;
    vectorDb.circuitBreaker.lastFailureTime = null;
    
    console.log('After reset:', vectorDb.circuitBreaker.state);
    
    // Simulate failures (handleError doesn't throw, it just processes errors)
    for (let i = 0; i < 5; i++) {
      vectorDb.handleError(new Error('Test error'));
    }
    
    console.log('After 5 failures:', vectorDb.circuitBreaker.state);
    console.log('✅ Circuit breaker test successful');
    
    // Test 4: Insert Document
    console.log('4. Testing document insertion...');
    const testDoc = {
      documentId: 'quick_test_doc',
      sourceType: 'test',
      sourceId: 'test_source',
      siteId: 'test_site',
      teamId: 'test_team',
      embedding: Array(1536).fill(0).map(() => Math.random()),
      content: 'Quick test document',
      metadata: { test: true }
    };
    
    const result = await vectorDb.insertDocument(testDoc);
    console.log('✅ Document insertion successful:', result.insertedId);
    
    // Cleanup
    await vectorDb.deleteDocument(testDoc.documentId);
    console.log('✅ Document cleanup successful');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await vectorDb.shutdown();
    console.log('🎉 Quick test completed');
  }
}

// Set environment variables
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server?retryWrites=true&w=majority";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyCGeKpBs18-Ie7uAIYEiT3Yyop6Jd9HBo0";
process.env.NODE_ENV = process.env.NODE_ENV || "development";
process.env.MONGODB_DATABASE = process.env.MONGODB_DATABASE || "Cryptique-Test-Server";

quickTest().catch(console.error); 