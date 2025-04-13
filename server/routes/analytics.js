const express = require('express');
const router = express.Router();

// Helper function to generate random number within range
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to round time to nearest 15 minutes
const roundToNearest15Minutes = (date) => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  date.setMinutes(roundedMinutes, 0, 0);
  return date;
};

// Mock data for testing
const mockData = {
  hourly: [
    { timestamp: '2024-01-01T00:00:00Z', visitors: 10, pageViews: 15 },
    { timestamp: '2024-01-01T01:00:00Z', visitors: 15, pageViews: 20 },
    { timestamp: '2024-01-01T02:00:00Z', visitors: 8, pageViews: 12 },
  ],
  daily: [
    { timestamp: '2024-01-01T00:00:00Z', visitors: 100, pageViews: 150 },
    { timestamp: '2024-01-02T00:00:00Z', visitors: 120, pageViews: 180 },
    { timestamp: '2024-01-03T00:00:00Z', visitors: 90, pageViews: 130 },
  ],
  weekly: [
    { timestamp: '2024-01-01T00:00:00Z', visitors: 700, pageViews: 1050 },
    { timestamp: '2024-01-08T00:00:00Z', visitors: 800, pageViews: 1200 },
    { timestamp: '2024-01-15T00:00:00Z', visitors: 750, pageViews: 1100 },
  ],
  monthly: [
    { timestamp: '2024-01-01T00:00:00Z', visitors: 3000, pageViews: 4500 },
    { timestamp: '2024-02-01T00:00:00Z', visitors: 3200, pageViews: 4800 },
    { timestamp: '2024-03-01T00:00:00Z', visitors: 3100, pageViews: 4650 },
  ]
};

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  // For now, return mock data
  res.json(mockData[timeframe] || mockData.daily);
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 