const express = require('express');
const { 
  getTransactions, 
  deleteTransactions,
  processNewTransaction,
  getCampaignStats
} = require('../controllers/transactionController');

const router = express.Router();

// Existing routes
router.get('/contract/:contractId', getTransactions);
router.delete('/contract/:contractId', deleteTransactions);

// New routes for campaign tracking
router.post('/process', processNewTransaction);
router.get('/campaign/:campaignId/stats', getCampaignStats);

module.exports = router; 