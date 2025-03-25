const express = require('express');
const { postCountryName } = require('../controllers/sdkController');

const router = express.Router();


router.post('/track', postCountryName);

module.exports = router;