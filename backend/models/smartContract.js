const mongoose = require("mongoose");
const Team = require("./team");

const smartContractSchema = new mongoose.Schema({
  contractId: {
    type: String,
    unique: true
  },
  address: {
    type: String,
    required: true,
  },
  name: {
    type: String
  },
  blockchain: {
    type: String,
    required: true
  },
  tokenSymbol: {
    type: String
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  },
  verified: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
smartContractSchema.index({ address: 1, blockchain: 1, team: 1 }, { unique: true });

const SmartContract = mongoose.model('SmartContract', smartContractSchema);

module.exports = SmartContract; 