const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats, updateDailyAnalyticsStats, updateWeeklyAnalyticsStats, updateMonthlyAnalyticsStats} = require('../controllers/sdkController');
const cors = require('cors');

const router = express.Router();

// Configure CORS for the SDK endpoints
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Handle preflight requests
router.options('*', cors(corsOptions));

// Apply CORS middleware to all SDK routes
router.use(cors(corsOptions));

// Define routes
router.post('/track', postAnalytics);
router.get('/analytics/:siteId', getAnalytics);
router.get('/update-all-analytics-stats-hourly', updateHourlyAnalyticsStats);
router.get('/update-all-analytics-stats-daily', updateDailyAnalyticsStats);
router.get('/update-all-analytics-stats-weekly', updateWeeklyAnalyticsStats);
router.get('/update-all-analytics-stats-monthly', updateMonthlyAnalyticsStats);

module.exports = router;
