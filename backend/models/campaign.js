const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  domain: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  medium: {
    type: String,
    required: true,
  },
  campaign: String,
  utm_id: {
    type: String,
    sparse: true,
    index: true
  },
  term: String,
  content: String,
  budget: {
    currency: String,
    amount: Number
  },
  shortenedDomain: {
    type: String,
    required: true,
  },
  longUrl: {
    type: String,
    required: true,
  },
  shortUrl: {
    type: String,
    required: true,
  },
  stats: {
    visitors: {
      type: Number,
      default: 0
    },
    uniqueVisitors: [{
      type: String
    }],
    web3Users: {
      type: Number,
      default: 0
    },
    uniqueWeb3Users: [{
      type: String
    }],
    uniqueWallets: {
      type: Number,
      default: 0
    },
    uniqueWalletAddresses: [{
      type: String
    }],
    transactions: [{
      txHash: String,
      contractAddress: String,
      walletAddress: String,
      value: Number,
      timestamp: Date,
      chainId: String,
      chainName: String
    }],
    transactedUsers: {
      type: Number,
      default: 0
    },
    uniqueTransactedWallets: [{
      type: String
    }],
    totalTransactionValue: {
      type: Number,
      default: 0
    },
    averageTransactionValue: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    conversionsValue: {
      type: Number,
      default: 0
    },
    cac: {
      type: Number,
      default: 0
    },
    roi: {
      type: Number,
      default: 0
    },
    sessionDurations: {
      type: Map,
      of: Number,
      default: new Map()
    },
    totalDuration: {
      type: Number,
      default: 0
    },
    averageDuration: {
      type: Number,
      default: 0
    },
    visitDuration: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    bounces: {
      type: Number,
      default: 0
    }
  },
  sessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session"
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
campaignSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Convert sessionDurations Map to Object for MongoDB storage
  if (this.stats.sessionDurations instanceof Map) {
    this.stats.sessionDurations = Object.fromEntries(this.stats.sessionDurations);
  }
  
  next();
});

// Convert sessionDurations back to Map after retrieving from MongoDB
campaignSchema.post('init', function(doc) {
  if (this.stats.sessionDurations && !(this.stats.sessionDurations instanceof Map)) {
    this.stats.sessionDurations = new Map(Object.entries(this.stats.sessionDurations));
  }
});

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign; 