const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Debug environment variables
console.log('Environment check on router load:', {
    hasGeminiApi: !!process.env.GEMINI_API,
    envKeys: Object.keys(process.env),
});

// Base URL for Google's Generative AI API
const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Helper function to validate and clean model name
const cleanModelName = (modelName) => {
    return modelName.replace(/^models\//, '');
};

// Helper function to create Google API request config
const createGoogleApiConfig = (additionalHeaders = {}) => {
    const apiKey = process.env.GEMINI_API;
    console.log('API Key check:', { hasKey: !!apiKey });
    
    if (!apiKey) {
        console.error('Missing GEMINI_API environment variable');
        throw new Error('GEMINI_API environment variable is not set');
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
        const apiKey = process.env.GEMINI_API;
        console.log('API Key status:', { exists: !!apiKey });

        if (!apiKey) {
            throw new Error('GEMINI_API environment variable is not set');
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

        // Send appropriate error response
        res.status(error.response?.status || 500).json({
            error: 'Failed to fetch models',
            details: error.response?.data || error.message
        });
    }
});

// Generate content
router.post('/generate', async (req, res) => {
    try {
        const { model, contents } = req.body;
        
        if (!process.env.GEMINI_API) {
            throw new Error('GEMINI_API environment variable is not set');
        }

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
            requestBody: req.body
        });

        // Send appropriate error response
        res.status(error.response?.status || 500).json({
            error: 'Failed to generate content',
            details: error.response?.data || error.message
        });
    }
});

module.exports = router; 