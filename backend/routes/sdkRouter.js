const express = require('express');
const { postAnalytics, getAnalytics} = require('../controllers/sdkController');

const router = express.Router();


router.post('/track', postAnalytics);
router.get('/analytics/:siteId', getAnalytics);

module.exports = router;