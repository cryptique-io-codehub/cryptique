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
  contractType: {
    type: String,
    enum: ['main', 'escrow'],
    default: 'main'
  },
  
  // Staking details for escrow contracts
  stakingDetails: {
    rewardToken: {
      type: String,
      default: 'ZBU'
    },
    stakingToken: {
      type: String,
      default: 'ZBU'
    },
    lockPeriod: {
      type: Number, // in days
      default: 365
    },
    apy: {
      type: Number, // annual percentage yield
      default: 0
    },
    minimumStake: {
      type: Number,
      default: 1
    },
    totalStaked: {
      type: Number,
      default: 0
    },
    totalRewards: {
      type: Number,
      default: 0
    }
  },

  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team"
  },
  verified: {
    type: Boolean,
    default: true
  },
  lastBlock: {
    type: Number,
    default: 0
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