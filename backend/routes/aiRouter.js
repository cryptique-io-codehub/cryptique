const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const VectorDocument = require('../models/vectorDocument');
const { GeminiEmbeddingService } = require('../services/geminiEmbeddingService');
const { performSemanticSearch } = require('../services/documentProcessingService');

// Configure CORS specifically for AI endpoints
const aiCorsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS middleware specifically to this router
router.use(cors(aiCorsOptions));

// Middleware to ensure CORS headers are set correctly
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('app.cryptique.io') || 
                 origin.includes('cryptique.io') || 
                 origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  // Handle preflight OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Debug environment variables
console.log('Environment check on router load:', {
    hasGeminiApi: !!process.env.GEMINI_API,
    envKeys: Object.keys(process.env),
});

// Base URL for Google's Generative AI API
const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Helper function to validate and clean model name
const cleanModelName = (modelName) => {
    // Remove 'models/' prefix if it exists
    const cleaned = modelName.replace(/^models\//, '');
    
    // Add 'models/' prefix if it doesn't exist
    return cleaned.startsWith('models/') ? cleaned : `models/${cleaned}`;
};

// Helper function to create Google API request config
const createGoogleApiConfig = (additionalHeaders = {}) => {
    // Check for environment variable, then use fallback
    const apiKey = process.env.GEMINI_API || 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
    console.log('API Key check:', { hasKey: !!apiKey, length: apiKey ? apiKey.length : 0 });
    
    if (!apiKey) {
        console.error('Missing GEMINI_API environment variable and fallback key');
        throw new Error('No API key available for Gemini');
    }
    
    return {
        headers: {
            'Content-Type': 'application/json',
            ...additionalHeaders
        },
        params: {
            key: apiKey
        }
    };
};

// Get available models
router.get('/models', async (req, res) => {
    try {
        console.log('Handling /models request');
        const apiKey = process.env.GEMINI_API || 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
        console.log('API Key status:', { exists: !!apiKey, length: apiKey ? apiKey.length : 0 });

        if (!apiKey) {
            throw new Error('No API key available for Gemini');
        }

        console.log('Fetching models from Google AI API...');
        const response = await axios.get(
            `${GOOGLE_AI_BASE_URL}/models`,
            createGoogleApiConfig()
        );

        console.log('Models fetched successfully');
        res.json(response.data);
    } catch (error) {
        console.error('Error in /models endpoint:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            stack: error.stack
        });

        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch models',
            details: error.response?.data || error.message
        });
    }
});

// Generate content
router.post('/generate', async (req, res) => {
    try {
        console.log('Handling /generate request');
        const { model, contents } = req.body;
        
        if (!model || !contents) {
            return res.status(400).json({ error: 'Model and contents are required' });
        }

        const cleanedModelName = cleanModelName(model);
        console.log('Using model:', cleanedModelName);
        
        const response = await axios.post(
            `${GOOGLE_AI_BASE_URL}/models/${cleanedModelName}:generateContent`,
            { contents },
            createGoogleApiConfig()
        );

        console.log('Content generated successfully');
        res.json(response.data);
    } catch (error) {
        console.error('Error in /generate endpoint:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            requestedModel: req.body?.model,
            cleanedModel: cleanModelName(req.body?.model || ''),
            requestBody: req.body
        });

        res.status(error.response?.status || 500).json({
            error: 'Failed to generate content',
            details: error.response?.data || error.message
        });
    }
});

// Debug route to test router
router.get('/test', (req, res) => {
    res.json({
        message: 'AI router is working',
        timestamp: new Date().toISOString()
    });
});

const embeddingService = new GeminiEmbeddingService();

router.post('/query', async (req, res) => {
  try {
    const { query, siteId, teamId, timeframe } = req.body;
    
    // Generate embedding for the query
    const queryEmbedding = await embeddingService.generateEmbedding(query);
    
    // Perform semantic search
    const relevantDocuments = await performSemanticSearch(
      queryEmbedding,
      {
        siteId,
        teamId,
        timeframe,
        status: 'active'
      }
    );
    
    // Aggregate data from relevant documents
    const aggregatedData = {
      metrics: [],
      visualizations: [],
      tables: [],
      insights: []
    };
    
    // Process each relevant document
    for (const doc of relevantDocuments) {
      switch (doc.metadata.dataType) {
        case 'metric':
          aggregatedData.metrics.push({
            title: doc.metadata.metricType,
            value: doc.content,
            change: doc.metadata.change
          });
          break;
          
        case 'event':
          // Add to time series data for visualizations
          if (doc.metadata.aggregationLevel) {
            aggregatedData.visualizations.push({
              type: 'multiLine',
              title: `${doc.metadata.metricType} Trend`,
              data: JSON.parse(doc.content)
            });
          }
          break;
          
        case 'insight':
          aggregatedData.insights.push(doc.content);
          break;
          
        case 'journey':
          aggregatedData.tables.push({
            title: 'User Journey Analysis',
            data: JSON.parse(doc.content)
          });
          break;
      }
    }
    
    res.json({
      success: true,
      data: aggregatedData
    });
    
  } catch (error) {
    console.error('Error processing CQ Intelligence query:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing query'
    });
  }
});

module.exports = router; 