const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

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

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/health`);
    res.json(response.data);
  } catch (error) {
    console.error('Error checking Python service health:', error);
    res.status(500).json({
      error: 'Failed to connect to Python embedding service',
      details: error.message
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
    
    const response = await axios.post(`${PYTHON_SERVICE_URL}/embed`, { text });
    res.json(response.data);
  } catch (error) {
    console.error('Error generating embedding:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to generate embedding',
      details: error.response?.data || error.message
    });
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
    
    const response = await axios.post(`${PYTHON_SERVICE_URL}/store`, { 
      text, 
      embedding, 
      metadata 
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error storing embedding:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to store embedding',
      details: error.response?.data || error.message
    });
  }
});

// Search embeddings
router.post('/search', async (req, res) => {
  try {
    const { queryEmbedding, filter, limit } = req.body;
    
    if (!queryEmbedding) {
      return res.status(400).json({ error: 'queryEmbedding parameter is required' });
    }
    
    const response = await axios.post(`${PYTHON_SERVICE_URL}/search`, { 
      queryEmbedding, 
      filter: filter || {}, 
      limit: limit || 10
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching embeddings:', error);
    res.status(error.response?.status || 500).json({
      error: 'Failed to search embeddings',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router; 