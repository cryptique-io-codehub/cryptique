const express = require('express');
const { 
  getContractTransactions,
  saveTransactions,
  getLatestBlockNumber,
  deleteContractTransactions
} = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Middleware to validate transaction data
const validateTransactionData = (req, res, next) => {
  console.log('validateTransactionData middleware called');
  console.log('Request params:', req.params);
  console.log('Request body keys:', Object.keys(req.body || {}));
  
  const { transactions } = req.body;
  
  // Check if transactions array exists
  if (!transactions || !Array.isArray(transactions)) {
    console.log('Invalid transaction data format');
    return res.status(400).json({ 
      message: "Invalid transaction data format. Expected an array of transactions." 
    });
  }
  
  // Check if array is empty
  if (transactions.length === 0) {
    console.log('No transactions provided');
    return res.status(400).json({ 
      message: "No transactions provided" 
    });
  }
  
  // Log transaction count
  console.log(`Received ${transactions.length} transactions for contract ${req.params.contractId}`);
  
  // Continue to next middleware
  next();
};

// Get transactions for a contract
router.get('/contract/:contractId', getContractTransactions);

// Save transactions for a contract
router.post('/contract/:contractId', validateTransactionData, saveTransactions);

// Get latest block number for a contract
router.get('/contract/:contractId/latest-block', getLatestBlockNumber);

// Delete all transactions for a contract
router.delete('/contract/:contractId', deleteContractTransactions);

module.exports = router; 