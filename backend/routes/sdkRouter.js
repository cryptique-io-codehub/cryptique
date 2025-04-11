const express = require('express');
const { postAnalytics, getAnalytics, updateHourlyAnalyticsStats} = require('../controllers/sdkController');

const router = express.Router();


router.post('/track', postAnalytics);
router.get('/analytics/:siteId', getAnalytics);
router.get('/update-all-analytics-stats-hourly', updateHourlyAnalyticsStats);
router.get('/update-all-analytics-stats-daily', updateDailyAnalyticsStats);
router.get('/update-all-analytics-stats-weekly', updateWeeklyAnalyticsStats);
router.get('/update-all-analytics-stats-monthly', updateMonthlyAnalyticsStats);

module.exports = router;
