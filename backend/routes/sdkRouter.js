const express = require('express');
const { postAnalytics, getAnalytics, updateAnalyticsStats} = require('../controllers/sdkController');

const router = express.Router();


router.post('/track', postAnalytics);
router.get('/analytics/:siteId', getAnalytics);
router.get('/update-all-analytics-stats', updateAnalyticsStats);

module.exports = router;
