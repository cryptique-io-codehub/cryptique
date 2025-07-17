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
  stakingDetails: {
    rewardToken: {
      type: String
    },
    stakingToken: {
      type: String
    },
    lockPeriod: {
      type: Number // in seconds
    },
    apy: {
      type: Number // annual percentage yield
    },
    minimumStake: {
      type: String // minimum amount to stake
    },
    totalStaked: {
      type: String // total amount currently staked
    },
    totalRewards: {
      type: String // total rewards distributed
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