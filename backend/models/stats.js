
const mongoose = require("mongoose");
const Analytics=require("./analytics")
const hourlyStats = new mongoose.Schema({
  siteId: String,
  stats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Analytics",
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const dailyStats = new mongoose.Schema({
  siteId: String,
  stats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Analytics",
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const weeklyStats = new mongoose.Schema({
  siteId: String,
  stats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Analytics",
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const monthlyStats = new mongoose.Schema({
  siteId: String,
  stats: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Analytics",
  },
  timeStamp: {
    type: Date,
    default: Date.now,
  },
});

const HourlyStats=mongoose.model("HourlyStats", hourlyStats);
const DailyStats=mongoose.model("DailyStats", dailyStats);
const WeeklyStats=mongoose.model("WeeklyStats", weeklyStats);
const MonthlyStats=mongoose.model("MonthlyStats", monthlyStats);

module.exports = {HourlyStats, DailyStats, WeeklyStats, MonthlyStats};

