const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  // Mock SDK data for testing
  const mockSDKData = {
    newVisitors: Math.floor(Math.random() * 5) + 1,
    totalPageViews: Math.floor(Math.random() * 10) + 1,
    walletsConnected: Math.floor(Math.random() * 3) + 1,
    sessions: [],
    userAgents: [],
    userId: [],
    web3UserId: [],
    websiteUrl: "https://cashtrek.org/"
  };
  
  // Process the data with 15-minute aggregation
  const processedData = generateAnalyticsData(mockSDKData);
  
  res.json(processedData);
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 