const dotenv = require('dotenv');
const path = require('path');
const { MongoClient } = require('mongodb');
const ragService = require('../server/services/ragService');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Sample data to initialize the RAG service
const SAMPLE_DOCUMENTS = [
  {
    text: 'The average session duration for premium users is 8.5 minutes, which is 40% higher than free users.',
    metadata: {
      siteId: 'demo-site-1',
      source: 'analytics-dashboard',
      type: 'metric',
      category: 'user-engagement',
      timestamp: new Date().toISOString()
    }
  },
  {
    text: 'Conversion rate from free to premium is highest on Tuesdays at 3 PM, with an average conversion rate of 12.5%.',
    metadata: {
      siteId: 'demo-site-1',
      source: 'conversion-analytics',
      type: 'insight',
      category: 'conversion',
      timestamp: new Date().toISOString()
    }
  },
  {
    text: 'Users who watch at least 3 tutorial videos are 3x more likely to upgrade to a paid plan within 7 days.',
    metadata: {
      siteId: 'demo-site-1',
      source: 'behavior-analytics',
      type: 'insight',
      category: 'user-behavior',
      timestamp: new Date().toISOString()
    }
  },
  {
    text: 'The most active time for user engagement is between 2 PM and 5 PM UTC, with a peak at 3:30 PM.',
    metadata: {
      siteId: 'demo-site-1',
      source: 'time-series-analytics',
      type: 'insight',
      category: 'time-based',
      timestamp: new Date().toISOString()
    }
  },
  {
    text: 'The bounce rate decreased by 15% after implementing the new onboarding flow.',
    metadata: {
      siteId: 'demo-site-1',
      source: 'a-b-testing',
      type: 'metric',
      category: 'conversion',
      timestamp: new Date().toISOString()
    }
  }
];

async function initializeRagService() {
  console.log('Initializing RAG service with sample data...');
  
  try {
    // Add sample documents to the RAG service
    for (const doc of SAMPLE_DOCUMENTS) {
      const result = await ragService.addDocument(doc.text, doc.metadata);
      if (result.success) {
        console.log(`Added document: ${doc.text.substring(0, 60)}...`);
      } else {
        console.error('Failed to add document:', result.error);
      }
    }
    
    console.log('RAG service initialization complete!');
    console.log('You can now test the RAG service by making requests to:');
    console.log('  - POST /api/rag/retrieve - To retrieve relevant context');
    console.log('  - POST /api/rag/generate - To generate responses using RAG');
    console.log('  - POST /api/rag/documents - To add new documents');
  } catch (error) {
    console.error('Error initializing RAG service:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeRagService();
