// models/analyticsModel.js
const mongoose = require('mongoose');

const hourlyStatsSchema = new mongoose.Schema({
    hour: {
      type: Date,
      required: true,
      index: true
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    walletsConnected: {
      type: Number,
      default: 0
    }
  });
const analyticsSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    unique: true
  },
  totalVisitors: {
    type: Number,
    default: 0
  },
  uniqueVisitors: {
    type: Number,
    default: 0
  },
  pageViews: {
    type: Number,
    default: 0
  },
  walletsConnected: {
    type: Number,
    default: 0
  },
  sessions: [{
    sessionId: String,
    startTime: Date,
    endTime: Date,
    pagesViewed: Number,
    duration: Number,
    isBounce: Boolean,
    country: String,
    browser: {
      name: String,
      version: String
    },
    device: {
      type: String, // 'mobile', 'desktop', 'tablet'
      os: String,
      resolution: String
    }
  
  }],
    hourlyStats: [hourlyStatsSchema],
  userAgents: [String], // To track unique devices
  walletAddresses: [String] // To track unique wallets
});

// Indexes for faster querying
analyticsSchema.index({ siteId: 1 });
analyticsSchema.index({ 'sessions.sessionId': 1 });
analyticsSchema.index({ 'hourlyStats.hour': 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;