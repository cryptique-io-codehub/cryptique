const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// Save transactions for a team
router.post('/save', async (req, res) => {
  try {
    const { teamId, transactions, lastFetch } = req.body;

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
      message: 'Transactions saved successfully'
    });
  } catch (error) {
    console.error('Error saving transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving transactions',
      error: error.message
    });
  }
});

// Load transactions for a team
router.get('/load', async (req, res) => {
  try {
    const { teamId } = req.query;

    const transactions = await Transaction.findOne({ teamId });

    if (!transactions) {
      return res.json({
        success: true,
        data: {
          transactions: {},
          lastFetch: {}
        }
      });
    }

    res.json({
      success: true,
      data: {
        transactions: transactions.transactions,
        lastFetch: transactions.lastFetch
      }
    });
  } catch (error) {
    console.error('Error loading transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading transactions',
      error: error.message
    });
  }
});

module.exports = router; 