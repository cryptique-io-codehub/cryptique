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

// Create a non-unique index for tx_hash (replace any existing unique index)
// To ensure this replaces any existing unique index, we need to drop it first in the database
// Use: db.transactions.dropIndex("tx_hash_1")

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 