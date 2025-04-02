// models/analyticsModel.js
const mongoose = require("mongoose");

const hourlyStatsSchema = new mongoose.Schema({
  hour: {
    type: Date,
    required: true,
    index: true,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
  walletsConnected: {
    type: Number,
    default: 0,
  },
});
const analyticsSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    unique: true,
  },
  websiteUrl: {
    type: String,
  },
  totalVisitors: {
    type: Number,
    default: 0,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
  pageViews: {
    type: Map,
    of: Number,
    default: {},
  },
  totalPageViews: {
    type: Number,
    default: 0,
  },
  newVisitors: {
    type: Number,
    default: 0,
  },
    returningVisitors: {
    type: Number,
    default: 0,
    },
  userId: [String],
  walletsConnected: {
    type: Number,
    default: 0,
  },
  sessions: [
    {
      sessionId: String,
      referrer: String,
      utmData: {
        source: String,
        medium: String,
        campaign: String,
        term: String,
        content: String,
      },
      walletAddresses: [String],
      chainId: [String],
      startTime: Date,
      endTime: Date,
      pagesViewed: Number,
      duration: Number,
      isBounce: Boolean,
      country: String,
      browser: {
        name: String,
        version: String,
      },
      device: {
        type: Object
      },
    },
  ],
  hourlyStats: [hourlyStatsSchema],
  userAgents: [String], // To track unique devices
  walletAddresses: [String], // To track unique wallets
  chainId: [String], // To track unique chains
});

// Indexes for faster querying
analyticsSchema.index({ siteId: 1 });
analyticsSchema.index({ "sessions.sessionId": 1 });
analyticsSchema.index({ "hourlyStats.hour": 1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;