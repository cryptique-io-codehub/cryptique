const express = require('express');
const router = express.Router();
const axios = require('axios');
require('dotenv').config();

// Helper function to validate and clean model name
const cleanModelName = (modelName) => {
    return modelName.replace(/^models\//, '');
};

// Get available models
router.get('/models', async (req, res) => {
    try {
        const response = await axios.get(
            'https://generativelanguage.googleapis.com/v1beta/models',
            {
                params: {
                    key: process.env.GEMINI_API
                }
            }
        );
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching models:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

// Generate content
router.post('/generate', async (req, res) => {
    try {
        const { model, contents } = req.body;
        
        if (!model || !contents) {
            return res.status(400).json({ error: 'Model and contents are required' });
        }

        const cleanedModelName = cleanModelName(model);
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${cleanedModelName}:generateContent`,
            { contents },
            {
                params: {
                    key: process.env.GEMINI_API
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error generating content:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({ 
            error: error.response?.data?.error || 'Failed to generate content' 
        });
    }
});

module.exports = router; 