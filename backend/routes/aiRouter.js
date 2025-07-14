const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Rate limiting middleware
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  message: {
    error: 'Too many AI requests, please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Queue for managing requests
const requestQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;
  
  isProcessing = true;
  
  while (requestQueue.length > 0) {
    const { prompt, resolve, reject } = requestQueue.shift();
    
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      });
      
      const response = await result.response;
      resolve(response.text());
      
    } catch (error) {
      console.error('AI Generation Error:', error);
      reject(error);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  isProcessing = false;
}

// AI query endpoint
router.post('/query', aiRateLimit, async (req, res) => {
  try {
    const { message, teamId, siteId, context } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Optimize prompt for analytics context
    const optimizedPrompt = `
As a web3 analytics expert, analyze this query: "${message.trim()}"

Context: ${context || 'general analytics'}
Team: ${teamId || 'unknown'}
Site: ${siteId || 'unknown'}

Provide a concise, helpful response about web3 analytics, user behavior, conversion patterns, or related insights. Keep response under 500 words.
    `.trim();
    
    // Add to queue
    const responsePromise = new Promise((resolve, reject) => {
      requestQueue.push({ prompt: optimizedPrompt, resolve, reject });
      processQueue();
    });
    
    // Set timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });
    
    const aiResponse = await Promise.race([responsePromise, timeoutPromise]);
    
    res.json({
      success: true,
      response: aiResponse,
      queueLength: requestQueue.length
    });
    
  } catch (error) {
    console.error('AI Query Error:', error);
    
    // Handle specific error types
    if (error.message === 'Request timeout') {
      return res.status(408).json({
        success: false,
        error: 'Request timeout. Please try again.',
        fallback: true
      });
    }
    
    if (error.message.includes('quota') || error.message.includes('429')) {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded. Please try again later.',
        fallback: true,
        retryAfter: 60
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable',
      fallback: true
    });
  }
});

// Get queue status
router.get('/status', (req, res) => {
  res.json({
    queueLength: requestQueue.length,
    isProcessing,
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'AI Router',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 