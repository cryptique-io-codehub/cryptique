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
    const { siteId, teamId, timeframe } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Find the analytics document for the site
    const Analytics = require('../models/analytics');
    const analytics = await Analytics.findOne({ siteId });
    
    if (!analytics) {
      return res.status(404).json({ error: 'Analytics data not found for site' });
    }
    
    // Add debug information to help debug
    const debugInfo = {
      sessionCount: analytics.sessions ? analytics.sessions.length : 0,
      hasUserJourneys: !!analytics.userJourneys,
      userJourneysCount: analytics.userJourneys ? analytics.userJourneys.length : 0
    };
    console.log('Debug info for user journeys:', debugInfo);
    
    // Extract user journeys
    let userJourneys = analytics.userJourneys || [];
    
    // If userJourneys is empty, try to process them first
    if (userJourneys.length === 0) {
      console.log('No user journeys found, attempting to process them now for site:', siteId);
      
      // Process the user journeys
      const AnalyticsProcessor = require('../utils/analyticsProcessor');
      const processor = new AnalyticsProcessor(siteId);
      
      try {
        const processingResult = await processor.processUserJourneys(siteId);
        console.log('Processing result:', processingResult);
        
        if (processingResult && processingResult.success) {
          // Reload the analytics document after processing
          const updatedAnalytics = await Analytics.findOne({ siteId });
          if (updatedAnalytics && updatedAnalytics.userJourneys && updatedAnalytics.userJourneys.length > 0) {
            userJourneys = updatedAnalytics.userJourneys;
            console.log(`Successfully processed ${userJourneys.length} user journeys for site ${siteId}`);
          } else {
            console.log('Analytics document found but userJourneys is still empty after processing');
            
            // Check if we need to manually save the journeys
            if (processingResult.journeysCreated > 0) {
              console.log('Journeys were created but not saved. Manually updating analytics document...');
              
              // Manually update the document with the processed journeys if available
              analytics.userJourneys = analytics.userJourneys || [];
              await analytics.save();
              
              // Reload the analytics document again
              const reloadedAnalytics = await Analytics.findOne({ siteId });
              if (reloadedAnalytics && reloadedAnalytics.userJourneys) {
                userJourneys = reloadedAnalytics.userJourneys;
              }
            }
          }
        } else {
          console.log('User journey processing returned no results:', processingResult);
        }
      } catch (processingError) {
        console.error('Error during automatic user journey processing:', processingError);
        // Continue with empty user journeys (don't fail the request)
      }
    }
    
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
        const filteredCount = userJourneys.length;
        userJourneys = userJourneys.filter(journey => 
          new Date(journey.lastVisit) >= startDate
        );
        console.log(`Applied timeframe filter: ${timeframe}, filtered from ${filteredCount} to ${userJourneys.length} journeys`);
      }
    }
    
    res.json({ 
      success: true,
      userJourneys,
      debugInfo
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
    
    console.log(`Processing user journeys for site: ${siteId}`);
    
    // Check if there are sessions for this site before trying to process journeys
    const Analytics = require('../models/analytics');
    const analytics = await Analytics.findOne({ siteId });
    
    if (!analytics) {
      console.log(`No analytics found for site: ${siteId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No analytics found for this site' 
      });
    }
    
    const sessionCount = analytics.sessions ? analytics.sessions.length : 0;
    console.log(`Found ${sessionCount} sessions for site: ${siteId}`);
    
    if (sessionCount === 0) {
      console.log(`No sessions to process for site: ${siteId}`);
      return res.json({
        success: false,
        error: 'No sessions found for this site',
        message: 'This site has no session data yet. Sessions are created when users visit your website with the tracking script installed.'
      });
    }
    
    // Process journeys with the static method from AnalyticsProcessor
    const AnalyticsProcessor = require('../utils/analyticsProcessor');
    const result = await AnalyticsProcessor.processAllUserJourneys(siteId);
    
    console.log(`Journey processing completed for site: ${siteId}`, result);
    
    if (!result.success) {
      // Return informative error for client
      let userMessage = 'Failed to process user journeys';
      if (result.message === 'No sessions found') {
        userMessage = 'No sessions found for this site. Make sure tracking is set up correctly.';
      } else if (result.message === 'No sessions with user IDs found') {
        userMessage = 'Sessions exist but none have user IDs. This could indicate tracking script issues.';
      }
      
      return res.status(400).json({ 
        success: false, 
        error: result.error || userMessage,
        details: result.message,
        message: userMessage
      });
    }
    
    // Return success response with detailed information
    res.json({ 
      success: true,
      ...result,
      message: `Successfully processed ${result.journeysCreated} user journeys from ${result.usersProcessed} users.`
    });
  } catch (error) {
    console.error('Error processing user journeys:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process user journeys',
      message: error.message
    });
  }
});

module.exports = router; 