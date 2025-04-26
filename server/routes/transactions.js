const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Transactions API is working',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Transactions API is running',
    timestamp: new Date().toISOString()
  });
});

// Save transactions for a team
router.post('/save', async (req, res) => {
  try {
    console.log('Received save request:', {
      teamId: req.body.teamId,
      transactionCount: req.body.transactions ? Object.keys(req.body.transactions).length : 0,
      lastFetchCount: req.body.lastFetch ? Object.keys(req.body.lastFetch).length : 0
    });

    const { teamId, transactions, lastFetch } = req.body;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'teamId is required'
      });
    }

    // Find existing transactions for this team
    let existingTransactions = await Transaction.findOne({ teamId });

    if (existingTransactions) {
      // Update existing transactions
      existingTransactions.transactions = transactions;
      existingTransactions.lastFetch = lastFetch;
      await existingTransactions.save();
    } else {
      // Create new transactions document
      existingTransactions = new Transaction({
        teamId,
        transactions,
        lastFetch
      });
      await existingTransactions.save();
    }

    res.json({
      success: true,
      message: 'Transactions saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving transactions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Load transactions for a team
router.get('/load', async (req, res) => {
  try {
    console.log('Received load request:', {
      teamId: req.query.teamId
    });

    const { teamId } = req.query;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'teamId is required'
      });
    }

    const transactions = await Transaction.findOne({ teamId });

    if (!transactions) {
      return res.json({
        success: true,
        data: {
          transactions: {},
          lastFetch: {}
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        transactions: transactions.transactions,
        lastFetch: transactions.lastFetch
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error loading transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading transactions',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 