const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');

// SDK track endpoint
router.post('/sdk/track', (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log the incoming data
    console.log('SDK Track Event:', { event, data });
    
    // Process the tracking data
    // TODO: Implement proper tracking data processing
    
    res.status(200).json({ 
      success: true, 
      message: 'Event tracked successfully' 
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track event' 
    });
  }
});

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  // Create SDK data structure based on the provided example
  const sdkData = {
    newVisitors: 3, // From the example
    totalPageViews: 5, // From the example
    walletsConnected: 1, // From the example
    sessions: [
      "67fb882a207715d4d5acc73a",
      "67fb885fa3530203fd9302ef",
      "67fb88b38c52adc0d7bfde43",
      "67fb88ce8c52adc0d7bfde68",
      "67fb8adcf940f2a429170d6f"
    ],
    userAgents: [],
    userId: ['usr_92e4zknbo', 'usr_0n4i0gcej', 'usr_l5s5fpbx4'],
    web3UserId: ['usr_l5s5fpbx4'],
    websiteUrl: "https://cashtrek.org/"
  };
  
  // Process the data with 15-minute aggregation
  const processedData = generateAnalyticsData(sdkData);
  
  res.json(processedData);
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 