const mongoose = require("mongoose");

const campaignSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true
  },
  medium: {
    type: String,
    required: true
  },
  campaign: String,
  term: String,
  content: String,
  budget: {
    currency: {
      type: String,
      default: 'USD'
    },
    amount: Number
  },
  shortenedDomain: {
    type: String,
    required: true
  },
  longUrl: {
    type: String,
    required: true
  },
  shortUrl: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  stats: {
    visitors: {
      type: Number,
      default: 0
    },
    webUsers: {
      type: Number,
      default: 0
    },
    uniqueWallets: {
      type: Number,
      default: 0
    },
    transactedUsers: {
      type: Number,
      default: 0
    },
    visitDuration: {
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
    }
  },
  sessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session"
  }]
});

// Index for efficient querying
campaignSchema.index({ siteId: 1, name: 1 });
campaignSchema.index({ shortUrl: 1 }, { unique: true });
campaignSchema.index({ createdAt: 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);

module.exports = Campaign; 