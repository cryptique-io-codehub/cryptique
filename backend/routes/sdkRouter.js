const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats, updateDailyAnalyticsStats, updateWeeklyAnalyticsStats, updateMonthlyAnalyticsStats} = require('../controllers/sdkController');
const cors = require('cors');
const Analytics = require('../models/analytics');

const router = express.Router();

// Configure CORS for SDK endpoints - allow all origins for the SDK
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-cryptique-website-id'],
  maxAge: 86400
};

// Apply CORS middleware
router.use(cors(corsOptions));

// Track analytics data
router.post('/track', async (req, res) => {
  try {
    const websiteId = req.headers['x-cryptique-website-id'];
    if (!websiteId) {
      return res.status(400).json({ 
        message: 'Website ID is required',
        error: 'Missing x-cryptique-website-id header'
      });
    }

    const {
      userId,
      event,
      properties,
      timestamp = new Date(),
      sessionId,
      pageUrl,
      referrer
    } = req.body;

    if (!userId || !event) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        error: 'userId and event are required'
      });
    }

    const analytics = new Analytics({
      websiteId,
      userId,
      event,
      properties,
      timestamp,
      sessionId,
      pageUrl,
      referrer
    });

    await analytics.save();
    res.status(200).json({ message: 'Analytics data tracked successfully' });
  } catch (error) {
    console.error('Error tracking analytics:', error);
    res.status(500).json({ 
      message: 'Error tracking analytics data',
      error: error.message 
    });
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
