const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats, updateDailyAnalyticsStats, updateWeeklyAnalyticsStats, updateMonthlyAnalyticsStats} = require('../controllers/sdkController');
const cors = require('cors');
const { track } = require('../controllers/trackController');
const { getEventConfig, trackEvent, trackEvents } = require('../controllers/eventController');

const router = express.Router();

// Ultra-permissive CORS options for SDK endpoints
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id', 'Accept', 'Origin'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false, // SDK doesn't need credentials
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes in this router
router.use(cors(corsOptions));

// Extra middleware to ensure CORS headers are set correctly for all browsers
router.use((req, res, next) => {
  // For SDK routes, allow any origin with a wildcard
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id, Accept, Origin');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle OPTIONS requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
});

// Handle all preflight requests explicitly
router.options('*', (req, res) => {
  res.status(204).end();
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

module.exports = router;
