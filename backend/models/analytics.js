// models/analyticsModel.js
const mongoose = require("mongoose");

const StatsSchema = new mongoose.Schema({
  stats: {
    type: Object, // Flexible but unvalidated
  },
  timeStamp: {
    type: Date,
    default: Date.now,
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
  web3Visitors: {
    type: Number,
    default: 0,
  },
  web3UserId: [String],
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
      userId: String,
      referrer: String,
      utmData: {
        source: String,
        medium: String,
        campaign: String,
        term: String,
        content: String,
      },
      wallet:{
        walletAddress: String,
        walletType: String,
        chainName: String
      },
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
  hourlyStats: [StatsSchema],
  dailyStats: [StatsSchema],
  weeklyStats: [StatsSchema],
  monthlyStats: [StatsSchema],
  userAgents: [String], // To track unique devices
  wallets: [
    {
      walletAddress: String,
      walletType: String,
      chainName: String
    }
  ]
});

// Pre-save hook to update walletsConnect
// Indexes for faster querying
analyticsSchema.index({ siteId: 1 });
analyticsSchema.index({ "sessions.sessionId": 1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;