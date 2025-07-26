/**
 * Aggregated Statistics Model
 * Pre-computed statistics for faster dashboard loading
 */

const mongoose = require('mongoose');

const aggregatedStatsSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true
  },
  timeframe: {
    type: String,
    required: true,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    index: true
  },
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  
  // Core metrics
  metrics: {
    visitors: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    pageViews: { type: Number, default: 0 },
    walletsConnected: { type: Number, default: 0 },
    web3Users: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    newVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 }
  },
  
  // Traffic sources breakdown
  trafficSources: [{
    source: String,
    visitors: Number,
    wallets: Number,
    percentage: Number
  }],
  
  // Top pages
  topPages: [{
    path: String,
    views: Number,
    uniqueVisitors: Number,
    avgDuration: Number,
    bounceRate: Number
  }],
  
  // Device breakdown
  deviceBreakdown: {
    desktop: { type: Number, default: 0 },
    mobile: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
    unknown: { type: Number, default: 0 }
  },
  
  // Browser breakdown
  browserBreakdown: {
    chrome: { type: Number, default: 0 },
    firefox: { type: Number, default: 0 },
    safari: { type: Number, default: 0 },
    edge: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Geographic data
  countryBreakdown: [{
    country: String,
    visitors: Number,
    percentage: Number
  }],
  
  // User journey metrics
  userJourneyMetrics: {
    totalJourneys: { type: Number, default: 0 },
    avgSessions: { type: Number, default: 0 },
    avgTimeSpent: { type: Number, default: 0 },
    avgPageViews: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    avgDaysToConversion: { type: Number, default: 0 }
  },
  
  // User segments
  userSegments: {
    converter: { type: Number, default: 0 },
    engaged: { type: Number, default: 0 },
    browser: { type: Number, default: 0 },
    bounced: { type: Number, default: 0 }
  },
  
  // Metadata
  computedAt: {
    type: Date,
    default: Date.now
  },
  dataPoints: {
    type: Number,
    default: 0
  },
  processingTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
aggregatedStatsSchema.index({ siteId: 1, timeframe: 1, timestamp: -1 });
aggregatedStatsSchema.index({ siteId: 1, timeframe: 1 });
aggregatedStatsSchema.index({ timestamp: 1 });

// TTL index for automatic cleanup (keep aggregated data for 2 years)
aggregatedStatsSchema.index({ computedAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

// Static method to get latest aggregated stats
aggregatedStatsSchema.statics.getLatest = function(siteId, timeframe, limit = 30) {
  return this.find({ siteId, timeframe })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to get stats for date range
aggregatedStatsSchema.statics.getDateRange = function(siteId, timeframe, startDate, endDate) {
  const query = { siteId, timeframe };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: 1 })
    .lean();
};

// Instance method to calculate growth rate
aggregatedStatsSchema.methods.calculateGrowthRate = function(previousPeriod) {
  if (!previousPeriod || previousPeriod.metrics.visitors === 0) {
    return 0;
  }
  
  const currentVisitors = this.metrics.visitors;
  const previousVisitors = previousPeriod.metrics.visitors;
  
  return ((currentVisitors - previousVisitors) / previousVisitors) * 100;
};

const AggregatedStats = mongoose.model('AggregatedStats', aggregatedStatsSchema);

module.exports = AggregatedStats;