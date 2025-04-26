const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    index: true
  },
  contractId: {
    type: String,
    required: true,
    index: true
  },
  transactions: [{
    tx_hash: {
      type: String,
      required: true
    },
    block_number: Number,
    block_time: String,
    from_address: String,
    to_address: String,
    value_eth: String,
    gas_used: String,
    status: String,
    tx_type: String,
    contract_address: String,
    token_name: String,
    token_symbol: String,
    usd_value: String,
    chain: String,
    raw_amount: String,
    is_token_transfer: Boolean
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient querying
transactionSchema.index({ teamId: 1, contractId: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction; 