const express = require("express");
const router = express.Router();
const Transaction = require("../models/transaction");

/**
 * Save transactions for a contract
 * POST /api/transactions
 */
router.post("/", async (req, res) => {
  try {
    const { teamId, contractId, transactions } = req.body;

    if (!teamId || !contractId || !transactions) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: teamId, contractId, transactions"
      });
    }

    // Find existing record or create a new one
    const existingRecord = await Transaction.findOne({ teamId, contractId });

    if (existingRecord) {
      // Update existing record
      // Combine new transactions with existing ones, eliminating duplicates
      const existingTxHashes = new Set(existingRecord.transactions.map(tx => tx.tx_hash));
      const uniqueNewTransactions = transactions.filter(tx => !existingTxHashes.has(tx.tx_hash));
      
      if (uniqueNewTransactions.length > 0) {
        // Add new unique transactions to the array
        existingRecord.transactions = [...uniqueNewTransactions, ...existingRecord.transactions];
        existingRecord.lastUpdated = Date.now();
        await existingRecord.save();
      }
      
      return res.status(200).json({
        success: true,
        message: `Updated with ${uniqueNewTransactions.length} new transactions`,
        transactionCount: existingRecord.transactions.length
      });
    } else {
      // Create new record
      const newTransactionRecord = new Transaction({
        teamId,
        contractId,
        transactions,
        lastUpdated: Date.now()
      });
      
      await newTransactionRecord.save();
      
      return res.status(201).json({
        success: true,
        message: `Saved ${transactions.length} transactions`,
        transactionCount: transactions.length
      });
    }
  } catch (error) {
    console.error("Error saving transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Error saving transactions",
      error: error.message
    });
  }
});

/**
 * Get transactions for a contract
 * GET /api/transactions/:teamId/:contractId
 */
router.get("/:teamId/:contractId", async (req, res) => {
  try {
    const { teamId, contractId } = req.params;

    const transactionRecord = await Transaction.findOne({ teamId, contractId });

    if (!transactionRecord) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this contract"
      });
    }

    return res.status(200).json({
      success: true,
      transactions: transactionRecord.transactions,
      lastUpdated: transactionRecord.lastUpdated
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching transactions",
      error: error.message
    });
  }
});

module.exports = router; 