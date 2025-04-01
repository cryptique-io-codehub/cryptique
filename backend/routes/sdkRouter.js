const express = require('express');
const {  postAnalytics } = require('../controllers/sdkController');

const router = express.Router();


router.post('/track', postAnalytics);

module.exports = router;