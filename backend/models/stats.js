const mongoose = require("mongoose");
const Analytics = require("./analytics");

const statsSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  analyticsSnapshot: [
    {
      analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analytics",
      },
      timestamp: {
        type: Date,
        required: true,
      },
      visitors: {
        type: Number,
        default: 0,
      },
      web3Users: {
        type: Number,
        default: 0,
      },
      walletsConnected: {
        type: Number,
        default: 0,
      },
      pageViews: {
        type: Number,
        default: 0,
      }
    },
  ],
  lastSnapshotAt: {
    type: Date,
    default: null,
  },
  timezone: {
    type: String,
    default: 'UTC'
  }
});

// Create indexes for efficient querying
statsSchema.index({ 'analyticsSnapshot.timestamp': 1 });
statsSchema.index({ siteId: 1, 'analyticsSnapshot.timestamp': 1 });

// Pre-save middleware to ensure data consistency
statsSchema.pre('save', function(next) {
  // Sort snapshots by timestamp
  this.analyticsSnapshot.sort((a, b) => a.timestamp - b.timestamp);
  next();
});

// Create models for different time periods
const HourlyStats = mongoose.model("HourlyStats", statsSchema);
const DailyStats = mongoose.model("DailyStats", statsSchema);
const WeeklyStats = mongoose.model("WeeklyStats", statsSchema);
const MonthlyStats = mongoose.model("MonthlyStats", statsSchema);

module.exports = {
  HourlyStats,
  DailyStats,
  WeeklyStats,
  MonthlyStats
};

