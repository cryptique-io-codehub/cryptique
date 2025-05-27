const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

// Determine if we should use the mock service
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const useMockService = process.env.USE_MOCK_EMBEDDING_SERVICE === 'true' || (isProduction && isVercel);

// Import mock service
const mockService = require('../services/mockEmbeddingService');

// Configure CORS for vector endpoints
const vectorCorsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware
router.use(cors(vectorCorsOptions));

// Python service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';

// Cache for service availability to prevent excessive checks
let pythonServiceAvailable = null;
let lastCheckTime = 0;
const CHECK_INTERVAL = 60000; // 1 minute

// Check if Python service is available
const checkServiceAvailability = async () => {
  // If we're configured to use mock service, don't check availability
  if (useMockService) {
    return false;
  }
  
  // Only check once per minute
  const now = Date.now();
  if (pythonServiceAvailable !== null && now - lastCheckTime < CHECK_INTERVAL) {
    return pythonServiceAvailable;
  }

  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`, { timeout: 2000 });
    pythonServiceAvailable = response.status === 200;
  } catch (error) {
    console.error('Python embedding service health check failed:', error.message);
    pythonServiceAvailable = false;
  }
  
  lastCheckTime = now;
  return pythonServiceAvailable;
};

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // If using mock service, return mock health
    if (useMockService) {
      const healthInfo = await mockService.healthCheck();
      return res.json({
        ...healthInfo,
        useMockService: true,
        isVercel: isVercel ? true : false
      });
    }
    
    const isAvailable = await checkServiceAvailability();
    
    if (isAvailable) {
      res.json({
        status: "healthy",
        service: "vector-embedding-api",
        implementation: "python",
        timestamp: new Date().toISOString(),
        useMockService: false
      });
    } else {
      res.status(503).json({
        status: "unavailable",
        service: "vector-embedding-api",
        message: "Python embedding service is not available",
        timestamp: new Date().toISOString(),
        useMockService: false
      });
    }
  } catch (error) {
    console.error('Error checking service health:', error);
    res.status(500).json({
      status: "error",
      service: "vector-embedding-api",
      error: 'Failed to connect to embedding service',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate embedding
router.post('/embed', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }
    
    // Check if we should use the mock service
    if (useMockService) {
      console.log('Using mock embedding service for embedding generation');
      const embedding = await mockService.embedText(text);
      return res.json({ embedding });
    }
    
    // Check Python service availability
    const isAvailable = await checkServiceAvailability();
    if (!isAvailable) {
      console.log('Python service unavailable, using mock service as fallback');
      const embedding = await mockService.embedText(text);
      return res.json({ 
        embedding,
        source: 'mock'
      });
    }
    
    // Use Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/embed`, { text }, { timeout: 10000 });
    res.json({
      ...response.data,
      source: 'python'
    });
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    
    // Try mock service as a last resort
    try {
      console.log('Error with primary service, attempting mock service');
      const embedding = await mockService.embedText(req.body.text);
      return res.json({ 
        embedding,
        source: 'mock_fallback'
      });
    } catch (mockError) {
      console.error('Mock service also failed:', mockError.message);
      
      // Differentiate between service unavailability and other errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          error: 'Embedding service is unavailable',
          status: "service_unavailable",
          details: error.message
        });
      } else {
        res.status(error.response?.status || 500).json({
          error: 'Failed to generate embedding',
          details: error.response?.data || error.message,
          status: error.response?.status ? "api_error" : "unknown_error"
        });
      }
    }
  }
});

// Store embedding
router.post('/store', async (req, res) => {
  try {
    const { text, embedding, metadata } = req.body;
    
    if (!text || !embedding || !metadata) {
      return res.status(400).json({ 
        error: 'Missing required parameters (text, embedding, metadata)' 
      });
    }
    
    // Check if we should use the mock service
    if (useMockService) {
      console.log('Using mock embedding service for storage');
      const result = await mockService.storeEmbedding(text, embedding, metadata);
      return res.json({ 
        success: true, 
        id: result.id,
        source: 'mock'
      });
    }
    
    // Check Python service availability
    const isAvailable = await checkServiceAvailability();
    if (!isAvailable) {
      console.log('Python service unavailable, using mock service as fallback');
      const result = await mockService.storeEmbedding(text, embedding, metadata);
      return res.json({ 
        success: true, 
        id: result.id,
        source: 'mock'
      });
    }
    
    // Use Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/store`, { 
      text, 
      embedding, 
      metadata 
    }, { timeout: 10000 });
    
    res.json({
      ...response.data,
      source: 'python'
    });
  } catch (error) {
    console.error('Error storing embedding:', error.message);
    
    // Try mock service as a last resort
    try {
      console.log('Error with primary service, attempting mock service');
      const { text, embedding, metadata } = req.body;
      const result = await mockService.storeEmbedding(text, embedding, metadata);
      return res.json({ 
        success: true, 
        id: result.id,
        source: 'mock_fallback'
      });
    } catch (mockError) {
      console.error('Mock service also failed:', mockError.message);
      
      // Differentiate between service unavailability and other errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          error: 'Embedding service is unavailable',
          status: "service_unavailable",
          details: error.message
        });
      } else {
        res.status(error.response?.status || 500).json({
          error: 'Failed to store embedding',
          details: error.response?.data || error.message,
          status: error.response?.status ? "api_error" : "unknown_error"
        });
      }
    }
  }
});

// Search embeddings
router.post('/search', async (req, res) => {
  try {
    const { queryEmbedding, filter, limit } = req.body;
    
    if (!queryEmbedding) {
      return res.status(400).json({ error: 'queryEmbedding parameter is required' });
    }
    
    // Check if we should use the mock service
    if (useMockService) {
      console.log('Using mock embedding service for search');
      const results = await mockService.searchEmbeddings(queryEmbedding, filter, limit);
      return res.json({ 
        results,
        source: 'mock'
      });
    }
    
    // Check Python service availability
    const isAvailable = await checkServiceAvailability();
    if (!isAvailable) {
      console.log('Python service unavailable, using mock service as fallback');
      const results = await mockService.searchEmbeddings(queryEmbedding, filter, limit);
      return res.json({ 
        results,
        source: 'mock'
      });
    }
    
    // Use Python service
    const response = await axios.post(`${PYTHON_SERVICE_URL}/search`, { 
      queryEmbedding, 
      filter: filter || {}, 
      limit: limit || 10
    }, { timeout: 15000 });
    
    res.json({
      ...response.data,
      source: 'python'
    });
  } catch (error) {
    console.error('Error searching embeddings:', error.message);
    
    // Try mock service as a last resort
    try {
      console.log('Error with primary service, attempting mock service');
      const { queryEmbedding, filter, limit } = req.body;
      const results = await mockService.searchEmbeddings(queryEmbedding, filter, limit);
      return res.json({ 
        results,
        source: 'mock_fallback'
      });
    } catch (mockError) {
      console.error('Mock service also failed:', mockError.message);
      
      // Differentiate between service unavailability and other errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        res.status(503).json({
          error: 'Embedding service is unavailable',
          status: "service_unavailable",
          details: error.message
        });
      } else {
        res.status(error.response?.status || 500).json({
          error: 'Failed to search embeddings',
          details: error.response?.data || error.message,
          status: error.response?.status ? "api_error" : "unknown_error"
        });
      }
    }
  }
});

module.exports = router; 