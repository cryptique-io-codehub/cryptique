const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats, updateDailyAnalyticsStats, updateWeeklyAnalyticsStats, updateMonthlyAnalyticsStats} = require('../controllers/sdkController');
const cors = require('cors');

const router = express.Router();

// Configure CORS for the SDK endpoints
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes in this router
router.use(cors(corsOptions));

// Middleware to ensure CORS headers are set - this is a backup in case the cors middleware doesn't work
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id');
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

module.exports = router;
