const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');

// Mock data generator for testing
const generateMockData = () => {
  const now = new Date();
  return [{
    timestamp: now.toISOString(),
    visitors: Math.floor(Math.random() * 10) + 1,
    pageViews: Math.floor(Math.random() * 20) + 1
  }];
};

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  // Generate mock data point
  const mockDataPoint = generateMockData();
  
  // Process the data with 15-minute aggregation
  const processedData = generateAnalyticsData(mockDataPoint);
  
  res.json(processedData);
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 