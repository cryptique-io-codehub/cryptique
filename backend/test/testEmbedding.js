/**
 * RAG System Integration Test
 * 
 * Tests the embedding generation, storage, and search functionality
 * to validate that both Python and JavaScript services work correctly.
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const TEST_TEXT = "This is a test document for embedding generation. It should create a valid vector representation.";
const API_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_METADATA = {
  source: 'test',
  documentId: 'test-doc-1',
  timestamp: new Date().toISOString()
};

// Color for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

/**
 * Run the tests
 */
async function runTests() {
  console.log(`${colors.blue}Starting RAG system integration tests${colors.reset}`);
  
  try {
    // Test 1: Check health endpoint
    console.log(`\n${colors.blue}Test 1: Health Check${colors.reset}`);
    const healthResponse = await axios.get(`${API_URL}/api/vector/health`);
    console.log(`${colors.green}✓ Health check succeeded${colors.reset}`);
    console.log(`  Service status: ${healthResponse.data.status}`);
    console.log(`  Service type: ${healthResponse.data.service}`);
    
    // Track if we're using mock service
    const usingMockService = healthResponse.data.useMockService;
    if (usingMockService) {
      console.log(`${colors.yellow}⚠ Using mock embedding service${colors.reset}`);
    }
    
    // Test 2: Generate embedding
    console.log(`\n${colors.blue}Test 2: Generate Embedding${colors.reset}`);
    const embedResponse = await axios.post(`${API_URL}/api/vector/embed`, { 
      text: TEST_TEXT 
    });
    
    const embedding = embedResponse.data.embedding;
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response - not an array');
    }
    
    console.log(`${colors.green}✓ Embedding generated successfully${colors.reset}`);
    console.log(`  Embedding length: ${embedding.length}`);
    console.log(`  First 5 values: ${embedding.slice(0, 5).join(', ')}`);
    
    // Test 3: Store embedding
    console.log(`\n${colors.blue}Test 3: Store Embedding${colors.reset}`);
    const storeResponse = await axios.post(`${API_URL}/api/vector/store`, {
      text: TEST_TEXT,
      embedding: embedding,
      metadata: TEST_METADATA
    });
    
    if (!storeResponse.data.success && !storeResponse.data.id) {
      throw new Error('Failed to store embedding');
    }
    
    console.log(`${colors.green}✓ Embedding stored successfully${colors.reset}`);
    console.log(`  Storage ID: ${storeResponse.data.id}`);
    
    // Test 4: Search for similar embeddings
    console.log(`\n${colors.blue}Test 4: Search Embeddings${colors.reset}`);
    const searchResponse = await axios.post(`${API_URL}/api/vector/search`, {
      queryEmbedding: embedding,
      filter: { 'metadata.source': 'test' },
      limit: 5
    });
    
    const results = searchResponse.data.results;
    if (!results || !Array.isArray(results)) {
      throw new Error('Invalid search results - not an array');
    }
    
    console.log(`${colors.green}✓ Search completed successfully${colors.reset}`);
    console.log(`  Found ${results.length} results`);
    
    if (results.length > 0) {
      console.log(`  Top result text: "${results[0].text.substring(0, 40)}..."`);
      console.log(`  Top result score: ${results[0].score}`);
    }
    
    console.log(`\n${colors.green}All tests passed successfully!${colors.reset}`);
    
    // Summary
    console.log(`\n${colors.blue}Test Summary:${colors.reset}`);
    console.log(`  Service type: ${usingMockService ? 'JavaScript (Mock)' : 'Python'}`);
    console.log(`  API URL: ${API_URL}`);
    console.log(`  Tests run: 4`);
    console.log(`  Tests passed: 4`);
    
  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Possible network issue.');
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests(); 