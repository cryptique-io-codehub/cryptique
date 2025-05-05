const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  console.log(`Chart data requested for site: ${siteId}, timeframe: ${timeframe}`);
  
  // In a production environment, this would connect to a real database
  // Return a minimal empty data structure for the chart
  res.json({
    success: true,
    data: [],
    labels: [],
    timeframe: timeframe,
    message: 'To view real chart data, please ensure the backend database is properly configured.'
  });
});

// Get user journeys data
router.get('/user-journeys', (req, res) => {
  const { siteId, teamId, timeframe, page = 1, limit = 25 } = req.query;
  
  console.log("User-journeys request received:", { siteId, teamId, timeframe, page, limit });
  
  // This would normally fetch real user journeys from a database
  // For now, we'll return an empty array to demonstrate the front-end's empty state handling
  // The user can use the process-journeys endpoint to generate real data
  const journeys = [];
  
  // Calculate pagination
  const totalItems = journeys.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const pageNum = parseInt(page);
  const startIndex = (pageNum - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  // Get paginated data
  const paginatedJourneys = journeys.slice(startIndex, endIndex);
  
  console.log(`Sending ${paginatedJourneys.length} user journeys, total: ${totalItems}, pages: ${totalPages}`);
  
  // Send response
  res.json({
    success: true,
    userJourneys: paginatedJourneys,
    totalPages: totalPages,
    page: pageNum,
    totalItems: totalItems
  });
});

// Get user sessions data
router.get('/user-sessions', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  console.log(`Fetching sessions for user: ${userId}`);
  
  // Return an empty array - in a real implementation this would fetch from the database
  res.json({
    success: true,
    sessions: [],
    message: 'To view real session data, please ensure the backend database is properly configured.'
  });
});

// Process user journeys - convert sessions into user journey data
router.post('/process-journeys', (req, res) => {
  const { siteId } = req.body;
  
  if (!siteId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Site ID is required' 
    });
  }
  
  console.log(`Processing user journeys for site: ${siteId}`);
  
  // In a real implementation, this would:
  // 1. Find all sessions for this site
  // 2. Group them by user ID
  // 3. Process them into journey analytics
  // 4. Save the results
  
  // For the development server, we should connect to the real backend
  // Return a placeholder response to inform the user they need to set up
  // the full backend to see real data
  res.json({
    success: true,
    processedCount: 0,
    userJourneys: [],
    message: 'To see real user journey data, please ensure the backend API is properly configured to process sessions.'
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 