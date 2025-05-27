const express = require('express');
const router = express.Router();

// Import route handlers
const healthHandler = require('./health');
const embedHandler = require('./embed');
const storeHandler = require('./store');

// Health check endpoint
router.get('/health', healthHandler);

// Embedding endpoint
router.post('/embed', embedHandler);

// Vector storage endpoint
router.post('/store', storeHandler);

module.exports = router; 