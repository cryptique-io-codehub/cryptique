// models/analyticsModel.js
const mongoose = require("mongoose");
const Session = require("./session");
const {
  HourlyStats,
  DailyStats,
  WeeklyStats,
  MonthlyStats,
} = require("./stats");

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
  sessions:[ {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session",
  }],
  hourlyStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "HourlyStats",
  },
  dailyStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DailyStats",
  },
  weeklyStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "WeeklyStats",
  },
  monthlyStats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MonthlyStats",
  },
  userAgents: [String], // To track unique devices
  wallets: [
    {
      walletAddress: String,
      walletType: String,
      chainName: String,
    },
  ],
});

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;
