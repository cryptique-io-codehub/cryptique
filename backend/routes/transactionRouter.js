const express = require('express');
const { 
  getContractTransactions,
  saveTransactions,
  getLatestBlockNumber
} = require('../controllers/transactionController');
const { verifyToken } = require('../middleware/authMiddleware');
const cors = require('cors');

const router = express.Router();

// Configure CORS specifically for transaction endpoints
const transactionCorsOptions = {
  origin: ["http://localhost:3000", "https://app.cryptique.io", "https://cryptique.io", "https://www.cryptique.io"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400
};

// Add explicit CORS handler for transaction routes
router.use(cors(transactionCorsOptions));

// Custom middleware to ensure CORS headers are set for transactions
router.use((req, res, next) => {
  const origin = req.headers.origin;
  if (transactionCorsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', transactionCorsOptions.methods.join(', '));
    res.header('Access-Control-Allow-Headers', transactionCorsOptions.allowedHeaders.join(', '));
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});

// Apply authentication middleware to all routes
router.use(verifyToken);

// Get transactions for a contract
router.get('/contract/:contractId', getContractTransactions);

// Save transactions for a contract
router.post('/contract/:contractId', saveTransactions);

// Get latest block number for a contract
router.get('/contract/:contractId/latest-block', getLatestBlockNumber);

module.exports = router; 