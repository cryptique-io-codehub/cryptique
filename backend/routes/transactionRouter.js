const express = require('express');
const { 
  getContractTransactions,
  saveTransactions,
  getLatestBlockNumber
} = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get transactions for a contract
router.get('/contract/:contractId', getContractTransactions);

// Save transactions for a contract
router.post('/contract/:contractId', saveTransactions);

// Get latest block number for a contract
router.get('/contract/:contractId/latest-block', getLatestBlockNumber);

module.exports = router; 