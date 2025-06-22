// models/analyticsModel.js
const mongoose = require("mongoose");
const Session = require("./session");
const {
  HourlyStats,
  DailyStats,
  WeeklyStats,
  MonthlyStats,
} = require("./stats");

// Add page sequence schema for tracking common paths
const pageSequenceSchema = new mongoose.Schema({
  sequence: [String], // Array of page paths in order
  count: { type: Number, default: 0 },
  conversionCount: { type: Number, default: 0 }, // How many led to wallet connection
  averageDuration: { type: Number, default: 0 } // Average time to complete this path
});

// Add user journey schema for cohort analysis
const userJourneySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  firstVisit: { type: Date, required: true },
  lastVisit: { type: Date },
  totalSessions: { type: Number, default: 1 },
  totalPageViews: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 }, // in seconds
  hasConverted: { type: Boolean, default: false },
  daysToConversion: { type: Number }, // Days from first visit to wallet connection
  userSegment: { type: String }, // e.g., "high-value", "one-time", etc.
  acquisitionSource: { type: String },
  sessionsBeforeConversion: { type: Number }
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
  
  // New fields for enhanced user journey tracking
  entryPages: {
    type: Map,
    of: Number,
    default: {},
  }, // Count of sessions starting on each page
  exitPages: {
    type: Map,
    of: Number,
    default: {},
  }, // Count of sessions ending on each page
  commonPathways: [pageSequenceSchema], // Most common page sequences
  userJourneys: [userJourneySchema], // Individual user journey data
  
  // Retention analysis data
  retentionByDay: [{
    day: { type: Number }, // Days since first visit (0, 1, 7, 30, etc.)
    count: { type: Number, default: 0 }, // Number of users who returned on this day
    percentage: { type: Number, default: 0 } // Percentage of users who returned
  }],
  
  // Conversion path analysis
  conversionPaths: [{
    sourceMedium: { type: String }, // UTM source/medium
    pathToConversion: [String], // Sequence of pages before conversion
    conversionCount: { type: Number, default: 0 }, // Number of conversions from this path
    avgTimeToConversion: { type: Number, default: 0 } // Average time to convert
  }],
  
  // Cross-device user analysis
  crossDeviceUsers: {
    type: Number,
    default: 0
  }, // Users who visit from multiple devices
  
  // Time metrics
  avgSessionsPerUser: { type: Number, default: 0 },
  avgTimeBetweenSessions: { type: Number, default: 0 }, // Average time between visits
  avgDaysActive: { type: Number, default: 0 } // Average number of unique days a user is active
});

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;
