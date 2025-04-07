const express = require('express');
const { postAnalytics, getAnalytics} = require('../controllers/sdkController');
const { updateAnalyticsStats } = require('../api/crone-jobs');

const router = express.Router();


router.post('/track', postAnalytics);
router.get('/analytics/:siteId', getAnalytics);
router.get('/update-all-analytics-stats/KIFJJI909HENO', updateAnalyticsStats);

module.exports = router;
