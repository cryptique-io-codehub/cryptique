const mongoose = require("mongoose");
const SmartContract = require("./smartContract");

const transactionSchema = new mongoose.Schema({
  contract: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SmartContract",
    required: true
  },
  contractId: {
    type: String,
    required: true,
    index: true
  },
  tx_hash: {
    type: String,
    required: true,
    index: true
  },
  block_number: {
    type: Number,
    index: true
  },
  block_time: {
    type: Date,
    index: true
  },
  chain: String,
  from_address: {
    type: String,
    index: true
  },
  to_address: {
    type: String,
    index: true
  },
  contract_address: String,
  gas_used: Number,
  status: String,
  token_name: String,
  token_symbol: String,
  tx_type: String,
  value_eth: String,
  
  // Staking analysis fields
  stakingAnalysis: {
    isStaking: {
      type: Boolean,
      default: false
    },
    stakingType: {
      type: String,
      enum: ['create_lock', 'increase_amount', 'withdraw', 'withdraw_early', 'increase_unlock_time', 'unknown'],
      default: null
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    details: {
      unlockTime: String,
      lockDurationDays: Number,
      unlockTimestamp: Number,
      amount: String,
      previousAmount: String,
      newUnlockTime: String
    }
  },
  
  // Legacy fields for backward compatibility
  stakingType: String,
  stakingConfidence: Number,
  
  // Method information
  method_name: String,
  method_signature: String,
  functionName: String,
  input: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient queries
transactionSchema.index({ contractId: 1, block_number: -1 });
transactionSchema.index({ contractId: 1, block_time: -1 });

// Make tx_hash unique only within a contractId context
// This allows the same transaction hash to exist for different contracts
transactionSchema.index({ contractId: 1, tx_hash: 1 }, { unique: true });

// Index for staking queries
transactionSchema.index({ contractId: 1, 'stakingAnalysis.isStaking': 1 });
transactionSchema.index({ contractId: 1, 'stakingAnalysis.stakingType': 1 });

// Create a non-unique index for tx_hash (replace any existing unique index)
// To ensure this replaces any existing unique index, we need to drop it first in the database
// Use: db.transactions.dropIndex("tx_hash_1")

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 