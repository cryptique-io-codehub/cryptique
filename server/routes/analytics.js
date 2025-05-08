const express = require('express');
const router = express.Router();
const axios = require('axios');
const { trackApiUsage, checkCQIntelligenceAccess } = require('../middleware/subscriptionCheck');

// Set backend API URL - use environment variable or default to production
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'https://cryptique-backend.vercel.app';

// Create axios instance for backend API calls
const backendAPI = axios.create({
  baseURL: BACKEND_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Get chart data
router.get('/chart', async (req, res) => {
  const { siteId, timeframe = 'daily', start, end } = req.query;
  
  if (!siteId) {
    return res.status(400).json({ success: false, error: 'Site ID is required' });
  }
  
  console.log(`Chart data requested for site: ${siteId}, timeframe: ${timeframe}, dates: ${start} to ${end}`);
  
  try {
    // Add options to pass through CORS headers
    const options = { 
      params: { 
        siteId, 
        timeframe,
        start,
        end
      },
      headers: {
        'Origin': req.headers.origin || '',
        'Referer': req.headers.referer || ''
      }
    };
    
    // Forward request to real backend
    const response = await backendAPI.get('/analytics/chart', options);
    
    // Return real data
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching chart data from backend:', error.message);
    
    // Provide more detailed error for debugging
    const errorResponse = {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch chart data from backend',
      message: error.message,
      request: {
        siteId,
        timeframe,
        start,
        end
      }
    };
    
    res.status(error.response?.status || 500).json(errorResponse);
  }
});

// Get user journeys data
router.get('/user-journeys', async (req, res) => {
  const { siteId, teamId, timeframe, page = 1, limit = 25 } = req.query;
  
  if (!siteId) {
    return res.status(400).json({ success: false, error: 'Site ID is required' });
  }
  
  console.log("User-journeys request received:", { siteId, teamId, timeframe, page, limit });
  
  try {
    // Forward request to real backend
    const response = await backendAPI.get('/analytics/user-journeys', { 
      params: { siteId, teamId, timeframe, page, limit } 
    });
    
    // Return real data
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching user journeys from backend:', error);
    res.status(error.response?.status || 500).json({
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user journeys from backend'
    });
  }
});

// Get user sessions data
router.get('/user-sessions', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  console.log(`Fetching sessions for user: ${userId}`);
  
  try {
    // Forward request to real backend
    const response = await backendAPI.get('/analytics/user-sessions', { 
      params: { userId } 
    });
    
    // Return real data
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching user sessions from backend:', error);
    res.status(error.response?.status || 500).json({
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user sessions from backend'
    });
  }
});

// Process user journeys - convert sessions into user journey data
router.post('/process-journeys', async (req, res) => {
  const { siteId } = req.body;
  
  if (!siteId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Site ID is required' 
    });
  }
  
  console.log(`Processing user journeys for site: ${siteId}`);
  
  try {
    // Forward request to real backend
    const response = await backendAPI.post('/analytics/process-journeys', { siteId });
    
    // Return real data with helpful status message
    let responseData = response.data;
    
    // Add a user-friendly message if not already present
    if (!responseData.message) {
      if (responseData.success) {
        responseData.message = `Successfully processed ${responseData.journeysCreated || 0} user journeys`;
      } else {
        responseData.message = 'Failed to process user journeys. Please try again later.';
      }
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error processing user journeys from backend:', error);
    
    // Get error details if available from the backend
    let errorMessage = 'Failed to process user journeys. Please try again later.';
    let errorDetails = null;
    
    if (error.response && error.response.data) {
      errorDetails = error.response.data.error || error.response.data.message;
      
      if (error.response.data.error === 'No sessions found for this site') {
        errorMessage = 'No sessions available to process. Please ensure users are visiting your site with the tracking script installed.';
      } else if (error.response.data.error === 'No sessions with user IDs found') {
        errorMessage = 'Sessions exist but no user data is available. This could indicate issues with the tracking script.';
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    }
    
    res.status(error.response?.status || 500).json({
      success: false, 
      error: errorMessage,
      details: errorDetails || error.message
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    // Test connection to real backend
    const response = await backendAPI.get('/health');
    res.json({ 
      message: 'Server is working!',
      backendStatus: response.data 
    });
  } catch (error) {
    res.json({ 
      message: 'Server is working but backend connection failed',
      error: error.message 
    });
  }
});

// Add the middleware to API-intensive routes
// Example: Add API tracking to routes that make expensive API calls
router.get('/onchain/:contractAddress', trackApiUsage, async (req, res) => {
  // ... existing route handler
});

// Example: Add CQ Intelligence access check to AI-powered routes
router.get('/intelligence/:type', checkCQIntelligenceAccess, async (req, res) => {
  // ... existing route handler
});

module.exports = router; 