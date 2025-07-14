const express = require('express');
const router = express.Router();
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const VectorDocument = require('../models/vectorDocument');
const GeminiEmbeddingService = require('../services/geminiEmbeddingService');
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
    // If the model name already includes 'models/', return as is
    if (modelName.startsWith('models/')) {
        return modelName;
    }
    // Otherwise, add the 'models/' prefix
    return `models/${modelName}`;
};

// Helper function to create Google API request config
const createGoogleApiConfig = (additionalHeaders = {}) => {
    const apiKey = process.env.GEMINI_API || process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
        console.error('Missing API key for Gemini');
        throw new Error('No API key available');
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
        const apiKey = process.env.GEMINI_API || process.env.GOOGLE_API_KEY;
        
        if (!apiKey) {
            console.error('Missing API key configuration');
            return res.status(503).json({
                error: 'AI service temporarily unavailable',
                details: 'The AI service is not properly configured. Please contact support.'
            });
        }

        console.log('Fetching models from Google AI API...');
        try {
            const response = await axios.get(
                `${GOOGLE_AI_BASE_URL}/models`,
                createGoogleApiConfig()
            );

            // Filter for only text generation Gemini models
            const models = response.data.models?.filter(m => 
                m.name.includes('gemini') && 
                !m.name.includes('vision') &&
                !m.name.includes('embedding') &&
                m.supportedGenerationMethods?.includes('generateContent')
            ) || [];

            console.log('Models fetched successfully:', models.map(m => m.name));
            res.json({ models });
        } catch (apiError) {
            console.error('Google AI API Error:', {
                status: apiError.response?.status,
                data: apiError.response?.data,
                message: apiError.message
            });

            if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                return res.status(503).json({
                    error: 'AI service temporarily unavailable',
                    details: 'Authentication error with AI service. Please verify API key configuration.'
                });
            }

            res.status(503).json({
                error: 'AI service temporarily unavailable',
                details: 'The AI service is currently unavailable. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Error in /models endpoint:', error);
        res.status(503).json({
            error: 'AI service temporarily unavailable',
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
});

// Generate content
router.post('/generate', async (req, res) => {
    try {
        console.log('Handling /generate request');
        const { model, contents } = req.body;
        
        if (!model || !contents) {
            return res.status(400).json({ 
                error: 'Invalid request',
                details: 'Model and contents are required'
            });
        }

        const cleanedModelName = cleanModelName(model);
        console.log('Using model:', cleanedModelName);
        
        try {
            const response = await axios.post(
                `${GOOGLE_AI_BASE_URL}/${cleanedModelName}:generateContent`,
                { contents },
                createGoogleApiConfig()
            );

            console.log('Content generated successfully');
            res.json(response.data);
        } catch (apiError) {
            console.error('Error generating content:', {
                status: apiError.response?.status,
                data: apiError.response?.data,
                message: apiError.message,
                model: cleanedModelName
            });

            if (apiError.response?.status === 404) {
                return res.status(503).json({
                    error: 'AI service temporarily unavailable',
                    details: `Model ${model} is not available. Please try a different model.`
                });
            }

            if (apiError.response?.status === 401 || apiError.response?.status === 403) {
                return res.status(503).json({
                    error: 'AI service temporarily unavailable',
                    details: 'Authentication error with AI service. Please verify API key configuration.'
                });
            }

            res.status(503).json({
                error: 'AI service temporarily unavailable',
                details: 'Failed to generate content. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Error in /generate endpoint:', error);
        res.status(503).json({
            error: 'AI service temporarily unavailable',
            details: 'An unexpected error occurred. Please try again later.'
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