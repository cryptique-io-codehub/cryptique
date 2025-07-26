const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const SITE_ID = 'demo-site-1'; // Use the same site ID as in the initialization script

// Helper function to make API requests
async function makeRequest(method, endpoint, data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await axios({
      method,
      url,
      headers,
      data,
      validateStatus: () => true, // Don't throw on HTTP error status
    });

    return {
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    console.error(`API request failed: ${error.message}`);
    return {
      status: 500,
      data: { success: false, error: error.message },
    };
  }
}

// Test the RAG service
async function testRagService() {
  console.log('Testing RAG Service...');
  console.log('API Base URL:', API_BASE_URL);
  console.log('Site ID:', SITE_ID);
  console.log('='.repeat(80));

  // 1. Test retrieving context
  console.log('1. Testing context retrieval...');
  const query = 'What is the average session duration for premium users?';
  console.log(`Query: "${query}"`);
  
  const retrieveResponse = await makeRequest('POST', '/api/rag/retrieve', {
    query,
    siteId: SITE_ID,
    limit: 3,
    minScore: 0.6,
  });

  console.log('Retrieve Response Status:', retrieveResponse.status);
  if (retrieveResponse.data.success) {
    console.log('Retrieved Context:');
    console.log(JSON.stringify(retrieveResponse.data.data.context, null, 2));
    console.log('Sources:', retrieveResponse.data.data.sources);
  } else {
    console.error('Failed to retrieve context:', retrieveResponse.data.error);
  }

  console.log('='.repeat(80));

  // 2. Test generating a response
  console.log('2. Testing response generation...');
  const generateResponse = await makeRequest('POST', '/api/rag/generate', {
    query,
    siteId: SITE_ID,
    contextLimit: 3,
    maxTokens: 500,
    temperature: 0.7,
  });

  console.log('Generate Response Status:', generateResponse.status);
  if (generateResponse.data.success) {
    console.log('Generated Response:');
    console.log(generateResponse.data.data.content);
    console.log('Sources:', generateResponse.data.data.sources);
  } else {
    console.error('Failed to generate response:', generateResponse.data.error);
  }

  console.log('='.repeat(80));

  // 3. Test adding a document
  console.log('3. Testing document addition...');
  const newDocument = {
    text: 'Premium users who use the mobile app have a 20% higher engagement rate than web users.',
    siteId: SITE_ID,
    metadata: {
      source: 'mobile-analytics',
      type: 'insight',
      category: 'user-engagement',
    },
  };

  const addDocResponse = await makeRequest('POST', '/api/rag/documents', newDocument);
  console.log('Add Document Response Status:', addDocResponse.status);
  
  if (addDocResponse.data.success) {
    console.log('Document added successfully!');
    console.log('Document ID:', addDocResponse.data.data.id);
    
    // 4. Test retrieving the newly added document
    console.log('\n4. Verifying the new document can be retrieved...');
    const verifyQuery = 'What is the engagement rate for premium mobile users?';
    console.log(`Verification Query: "${verifyQuery}"`);
    
    const verifyResponse = await makeRequest('POST', '/api/rag/retrieve', {
      query: verifyQuery,
      siteId: SITE_ID,
      limit: 1,
    });

    if (verifyResponse.data.success && verifyResponse.data.data.context) {
      console.log('Retrieved Document:');
      console.log(verifyResponse.data.data.context);
      console.log('Source:', verifyResponse.data.data.sources);
    } else {
      console.error('Failed to retrieve the new document:', verifyResponse.data.error);
    }
  } else {
    console.error('Failed to add document:', addDocResponse.data.error);
  }

  console.log('='.repeat(80));
  console.log('RAG Service Test Completed');
}

// Run the tests
(async () => {
  try {
    await testRagService();
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
})();
