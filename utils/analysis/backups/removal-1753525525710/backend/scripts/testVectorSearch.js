const { MongoClient } = require('mongodb');

async function testVectorSearch() {
  console.log('🔍 Testing Vector Search Functionality...');
  
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db('Cryptique-Test-Server');
  
  try {
    // Test 1: Basic vector search
    console.log('\n1. Testing basic vector search...');
    const queryVector = Array(1536).fill(0).map(() => Math.random());
    
    const result = await db.collection('vectordocuments').aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: 100,
          limit: 5
        }
      }
    ]).toArray();
    
    console.log('✅ Vector search successful!');
    console.log(`📊 Found ${result.length} results`);
    
    if (result.length > 0) {
      console.log('📝 Sample result:');
      console.log(`   - Document ID: ${result[0].documentId}`);
      console.log(`   - Source Type: ${result[0].sourceType}`);
      console.log(`   - Site ID: ${result[0].siteId}`);
      console.log(`   - Score: ${result[0].score || 'N/A'}`);
    }
    
    // Test 2: Vector search with filters
    console.log('\n2. Testing vector search with filters...');
    const filteredResult = await db.collection('vectordocuments').aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryVector,
          numCandidates: 100,
          limit: 5,
          filter: {
            sourceType: { $eq: 'analytics' }
          }
        }
      }
    ]).toArray();
    
    console.log('✅ Filtered vector search successful!');
    console.log(`📊 Found ${filteredResult.length} filtered results`);
    
    // Test 3: Check collection stats
    console.log('\n3. Checking collection statistics...');
    const count = await db.collection('vectordocuments').countDocuments();
    console.log(`📈 Collection stats:`);
    console.log(`   - Total documents: ${count}`);
    
    // Test 4: List available indexes
    console.log('\n4. Listing available indexes...');
    const indexes = await db.collection('vectordocuments').listIndexes().toArray();
    console.log('📋 Available indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 All vector search tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Vector search test failed:', error.message);
    if (error.message.includes('index not found')) {
      console.log('\n💡 Tip: Make sure the vector_index is created in MongoDB Atlas');
      console.log('   Go to Atlas → Search → Create Vector Search Index');
    }
  } finally {
    await client.close();
  }
}

testVectorSearch().catch(console.error); 