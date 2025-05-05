const express = require('express');
const router = express.Router();
const cors = require('cors');
const AnalyticsProcessor = require('../utils/analyticsProcessor');

// Configure CORS for analytics endpoints
const corsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware to ensure CORS headers are set
const setCorsHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
  next();
};

// Apply CORS and headers middleware
router.use(cors(corsOptions));
router.use(setCorsHeaders);

// Handle preflight requests
router.options('*', (req, res) => {
  res.status(204).end();
});

// Get chart data
router.get('/chart', async (req, res) => {
  try {
    const { siteId, timeframe, start, end } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const processor = new AnalyticsProcessor(siteId);
    
    // Parse dates if provided
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date' });
    }
    
    const chartData = await processor.getChartData(timeframe, startDate, endDate);
    res.json(chartData);
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Get traffic sources data
router.get('/traffic-sources', async (req, res) => {
  try {
    const { siteId, start, end } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const processor = new AnalyticsProcessor(siteId);
    
    // Parse dates if provided
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date' });
    }
    
    const trafficSources = await processor.getTrafficSources(startDate, endDate);
    res.json({ sources: trafficSources });
  } catch (error) {
    console.error('Error getting traffic sources:', error);
    res.status(500).json({ error: 'Failed to get traffic sources' });
  }
});

// Get user sessions by userId
router.get('/user-sessions', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find the analytics document for the current site
    const Session = require('../models/session');
    
    // Get all sessions for this user
    const sessions = await Session.find({ userId })
      .sort({ startTime: -1 })
      .limit(50); // Limit to 50 most recent sessions
    
    res.json({ 
      success: true,
      sessions 
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

// Get user journeys
router.get('/user-journeys', async (req, res) => {
  try {
    const { siteId, timeframe } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Find the analytics document for the site
    const Analytics = require('../models/analytics');
    const analytics = await Analytics.findOne({ siteId });
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics data not found for site' });
    }
    
    // Extract user journeys
    let userJourneys = analytics.userJourneys || [];
    
    // Apply timeframe filtering if specified
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'yesterday':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'quarter':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          startDate.setDate(startDate.getDate() - 90);
          break;
      }
      
      if (startDate) {
        userJourneys = userJourneys.filter(journey => 
          journey.lastVisit >= startDate
        );
      }
    }
    
    res.json({ 
      success: true,
      userJourneys
    });
  } catch (error) {
    console.error('Error getting user journeys:', error);
    res.status(500).json({ error: 'Failed to get user journeys' });
  }
});

// Update analytics data
router.post('/update', async (req, res) => {
  try {
    const { siteId, analyticsId } = req.body;
    
    if (!siteId || !analyticsId) {
      return res.status(400).json({ error: 'Site ID and Analytics ID are required' });
    }

    const processor = new AnalyticsProcessor(siteId);
    await processor.updateStats(analyticsId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

// Process user journeys for a site
router.post('/process-journeys', async (req, res) => {
  try {
    const { siteId } = req.body;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Process journeys
    const result = await AnalyticsProcessor.processAllUserJourneys(siteId);
    
    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Failed to process user journeys' });
    }
    
    res.json({ 
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error processing user journeys:', error);
    res.status(500).json({ error: 'Failed to process user journeys' });
  }
});

module.exports = router; 