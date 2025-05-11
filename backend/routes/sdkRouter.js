const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats, updateDailyAnalyticsStats, updateWeeklyAnalyticsStats, updateMonthlyAnalyticsStats} = require('../controllers/sdkController');
const cors = require('cors');
const { track } = require('../controllers/trackController');
const { getEventConfig, trackEvent, trackEvents } = require('../controllers/eventController');

const router = express.Router();

// Configure CORS for the SDK endpoints - allow specific origins
const corsOptions = {
  origin: function(origin, callback) {
    // List of allowed domains for SDK tracking
    const allowedOrigins = [
      'https://app.cryptique.io', 
      'https://cryptique.io', 
      'http://localhost:3000',
      'https://cashtrek.org',
      'https://www.cashtrek.org'
    ];
    
    // Either allow any origin in development, or check against allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin);
    } else {
      // For debugging purposes, log the rejected origin
      console.log(`CORS rejected origin: ${origin}`);
      callback(null, allowedOrigins[0]); // Allow the request but with a different origin
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id', 'Accept'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false, // SDK doesn't need credentials
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes in this router
router.use(cors(corsOptions));

// Middleware to ensure CORS headers are set - this is a backup in case the cors middleware doesn't work
router.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // List of allowed domains for SDK tracking
  const allowedOrigins = [
    'https://app.cryptique.io', 
    'https://cryptique.io', 
    'http://localhost:3000',
    'https://cashtrek.org',
    'https://www.cashtrek.org'
  ];
  
  // Set the appropriate CORS headers
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  } else {
    // Allow the request with a default origin
    res.header('Access-Control-Allow-Origin', 'https://app.cryptique.io');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id, Accept');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Define routes with error handling
router.post('/track', async (req, res) => {
  try {
    await postAnalytics(req, res);
  } catch (error) {
    console.error('Error in track endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/analytics/:siteId', async (req, res) => {
  try {
    await getAnalytics(req, res);
  } catch (error) {
    console.error('Error in analytics endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats update routes
router.get('/update-all-analytics-stats-hourly', updateHourlyAnalyticsStats);
router.get('/update-all-analytics-stats-daily', updateDailyAnalyticsStats);
router.get('/update-all-analytics-stats-weekly', updateWeeklyAnalyticsStats);
router.get('/update-all-analytics-stats-monthly', updateMonthlyAnalyticsStats);

// Event tracking endpoints
router.post('/track-event', trackEvent);          // Track a single event
router.post('/track-events', trackEvents);        // Track multiple events in batch
router.get('/events/:siteId', getEventConfig);    // Get event configuration for a website

// Handle preflight requests for all endpoints
router.options('*', cors(corsOptions));

module.exports = router;
