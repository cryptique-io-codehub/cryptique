
const mongoose = require("mongoose");
const Analytics=require("./analytics")
const hourlyStats = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    unique: true, // 1 doc per siteId
  },
  analyticsSnapshot: [
    {
      analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analytics",
      },
      hour: {
        type: Date, // Rounded to the hour
        required: true,
      },
    },
  ],
  lastSnapshotAt: {
    type: Date,
    default: null,
  }  
});

const dailyStats = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    unique: true, // 1 doc per siteId
  },
  analyticsSnapshot: [
    {
      analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analytics",
      },
      hour: {
        type: Date, // Rounded to the hour
        required: true,
      },
    },
  ],
  lastSnapshotAt: {
    type: Date,
    default: null,
  }  
});

const weeklyStats = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    unique: true, // 1 doc per siteId
  },
  analyticsSnapshot: [
    {
      analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analytics",
      },
      hour: {
        type: Date, // Rounded to the hour
        required: true,
      },
    },
  ],
  lastSnapshotAt: {
    type: Date,
    default: null,
  }  
});

const monthlyStats = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    unique: true, // 1 doc per siteId
  },
  analyticsSnapshot: [
    {
      analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Analytics",
      },
      hour: {
        type: Date, // Rounded to the hour
        required: true,
      },
    },
  ],
  lastSnapshotAt: {
    type: Date,
    default: null,
  }  
});

const HourlyStats=mongoose.model("HourlyStats", hourlyStats);
const DailyStats=mongoose.model("DailyStats", dailyStats);
const WeeklyStats=mongoose.model("WeeklyStats", weeklyStats);
const MonthlyStats=mongoose.model("MonthlyStats", monthlyStats);

module.exports = {HourlyStats, DailyStats, WeeklyStats, MonthlyStats};

