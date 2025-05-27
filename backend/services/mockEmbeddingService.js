/**
 * Mock Embedding Service
 * 
 * This provides a JavaScript-based fallback when the Python embedding service
 * is not available, such as in Vercel deployments.
 * 
 * It creates deterministic "fake" embeddings that can be used for testing
 * or when the real embedding service isn't available.
 */

const crypto = require('crypto');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME || 'cryptique';
const COLLECTION_NAME = process.env.MONGODB_VECTOR_COLLECTION || 'embeddings';

// Cache for stored embeddings to simulate vector search
let embeddingsCache = [];
let isConnected = false;
let db = null;
let collection = null;

// Connect to MongoDB
async function connectToMongoDB() {
  if (isConnected) return { db, collection };

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    isConnected = true;
    
    console.log('Mock embedding service connected to MongoDB');
    return { db, collection };
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

// Generate deterministic embedding from text
function generateMockEmbedding(text) {
  // Create a deterministic hash of the text
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  
  // Convert hash to a fixed-length array of numbers between -1 and 1
  const embedding = [];
  const dimension = 128; // Much smaller than real embeddings
  
  for (let i = 0; i < dimension; i++) {
    // Use parts of the hash to generate pseudo-random but deterministic values
    const value = parseInt(hash.substring(i % 32, i % 32 + 2), 16) / 255;
    // Convert to range -1 to 1
    embedding.push(value * 2 - 1);
  }
  
  return embedding;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Compute embedding for text
async function embedText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input');
  }
  
  return generateMockEmbedding(text);
}

// Store embedding in MongoDB
async function storeEmbedding(text, embedding, metadata) {
  await connectToMongoDB();
  
  const document = {
    text,
    embedding,
    metadata,
    createdAt: new Date()
  };
  
  // Add to local cache for search
  embeddingsCache.push(document);
  
  // Store in MongoDB
  const result = await collection.insertOne(document);
  return { id: result.insertedId };
}

// Search for similar embeddings
async function searchEmbeddings(queryEmbedding, filter = {}, limit = 10) {
  await connectToMongoDB();
  
  // Load cache from DB if empty
  if (embeddingsCache.length === 0) {
    embeddingsCache = await collection.find({}).toArray();
  }
  
  // Apply filters
  let filteredEmbeddings = embeddingsCache;
  
  if (filter && Object.keys(filter).length > 0) {
    filteredEmbeddings = filteredEmbeddings.filter(doc => {
      // Simple filtering logic - not as sophisticated as MongoDB's
      for (const [key, value] of Object.entries(filter)) {
        // Handle $in operator for arrays
        if (key.includes('$in')) {
          return false; // Not implementing complex operators in mock
        }
        
        // Handle nested paths like metadata.source
        const parts = key.split('.');
        let docValue = doc;
        for (const part of parts) {
          if (docValue && typeof docValue === 'object') {
            docValue = docValue[part];
          } else {
            return false;
          }
        }
        
        if (docValue !== value) {
          return false;
        }
      }
      return true;
    });
  }
  
  // Calculate similarity scores
  const scoredResults = filteredEmbeddings.map(doc => {
    const similarity = cosineSimilarity(queryEmbedding, doc.embedding);
    return {
      text: doc.text,
      metadata: doc.metadata,
      score: similarity
    };
  });
  
  // Sort by similarity score and limit results
  return scoredResults
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Health check
async function healthCheck() {
  return {
    status: 'healthy',
    service: 'mock-embedding-service',
    type: 'javascript',
    message: 'This is a mock service for development/testing'
  };
}

module.exports = {
  embedText,
  storeEmbedding,
  searchEmbeddings,
  healthCheck
}; 