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

// Simplified analytics schema focused on core metrics
const analyticsSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  websiteUrl: {
    type: String,
    index: true
  },
  
  // Summary metrics (calculated via aggregation)
  summaryMetrics: {
    totalVisitors: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    web3Visitors: { type: Number, default: 0 },
    totalPageViews: { type: Number, default: 0 },
    newVisitors: { type: Number, default: 0 },
    returningVisitors: { type: Number, default: 0 },
    walletsConnected: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    bounceRate: { type: Number, default: 0 }
  },
  
  // Page views data - simplified
  pageViews: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // User identification arrays
  userId: [String],
  web3UserId: [String],
  
  // Wallet data - simplified
  wallets: [{
      walletAddress: String,
      walletType: String,
      chainName: String,
    firstSeen: { type: Date, default: Date.now }
  }],
  
  // Entry and exit pages for funnel analysis
  entryPages: {
    type: Map,
    of: Number,
    default: new Map()
  },
  exitPages: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Vector search field for RAG implementation
  contentVector: {
    type: [Number],
    sparse: true,
    select: false // Don't return by default to save bandwidth
  },
  
  // Text content for vector generation
  textContent: {
    type: String,
    select: false
  },
  
  // References to related data (instead of embedding)
  sessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session"
  }],
  
  // Metadata for better organization
  metadata: {
    lastProcessed: { type: Date, default: Date.now },
    dataQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor'],
      default: 'good'
    },
    processingVersion: { type: String, default: '2.0' }
  },
  
  // TTL for automatic data cleanup - 2 years retention
  expiresAt: {
    type: Date,
    default: () => {
      const date = new Date();
      date.setFullYear(date.getFullYear() + 2);
      return date;
    },
    index: { expires: 0 }
  }
}, { 
  timestamps: true,
  // Optimize for queries
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient querying
analyticsSchema.index({ siteId: 1, 'summaryMetrics.web3Visitors': 1 });
analyticsSchema.index({ siteId: 1, createdAt: -1 });
analyticsSchema.index({ 'summaryMetrics.totalVisitors': -1 });

// Virtual for conversion rate
analyticsSchema.virtual('conversionRate').get(function() {
  if (this.summaryMetrics.totalVisitors === 0) return 0;
  return (this.summaryMetrics.web3Visitors / this.summaryMetrics.totalVisitors) * 100;
});

// Static method to get analytics with aggregated session data
analyticsSchema.statics.getAnalyticsWithSessions = async function(siteId, dateRange = {}) {
  const matchStage = { siteId };
  
  if (dateRange.start && dateRange.end) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'sessions',
        localField: 'sessions',
        foreignField: '_id',
        as: 'sessionData',
        pipeline: [
          {
            $project: {
              duration: 1,
              pagesViewed: 1,
              isWeb3User: 1,
              country: 1,
              browser: 1,
              startTime: 1
            }
          }
        ]
      }
    },
    {
      $addFields: {
        totalSessions: { $size: '$sessionData' },
        avgSessionDuration: { $avg: '$sessionData.duration' },
        web3Sessions: {
          $size: {
            $filter: {
              input: '$sessionData',
              cond: { $eq: ['$$this.isWeb3User', true] }
            }
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to update summary metrics from sessions
analyticsSchema.statics.updateSummaryMetrics = async function(siteId) {
  const Session = require('./session');
  
  // Aggregate session data
  const sessionStats = await Session.aggregate([
    { $match: { siteId } },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        web3Users: {
          $addToSet: {
            $cond: [{ $eq: ['$isWeb3User', true] }, '$userId', null]
          }
        },
        totalPageViews: { $sum: '$pagesViewed' },
        totalDuration: { $sum: '$duration' },
        bounces: {
          $sum: {
            $cond: [{ $eq: ['$isBounce', true] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        uniqueVisitors: { $size: '$uniqueUsers' },
        web3Visitors: {
          $size: {
            $filter: {
              input: '$web3Users',
              cond: { $ne: ['$$this', null] }
            }
          }
        },
        avgSessionDuration: {
          $cond: [
            { $gt: ['$totalSessions', 0] },
            { $divide: ['$totalDuration', '$totalSessions'] },
            0
          ]
        },
        bounceRate: {
          $cond: [
            { $gt: ['$totalSessions', 0] },
            { $multiply: [{ $divide: ['$bounces', '$totalSessions'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
  
  if (sessionStats.length > 0) {
    const stats = sessionStats[0];
    
    // Update analytics document
    await this.findOneAndUpdate(
      { siteId },
      {
        $set: {
          'summaryMetrics.totalVisitors': stats.totalSessions,
          'summaryMetrics.uniqueVisitors': stats.uniqueVisitors,
          'summaryMetrics.web3Visitors': stats.web3Visitors,
          'summaryMetrics.totalPageViews': stats.totalPageViews,
          'summaryMetrics.avgSessionDuration': Math.round(stats.avgSessionDuration),
          'summaryMetrics.bounceRate': Math.round(stats.bounceRate * 100) / 100,
          'metadata.lastProcessed': new Date()
        }
      },
      { upsert: true, new: true }
    );
  }
  
  return sessionStats[0] || null;
};

// Instance method to generate text content for vector search
analyticsSchema.methods.generateTextContent = function() {
  let text = '';
  
  if (this.siteId) {
    text += `Site ID: ${this.siteId}\n`;
  }
  
  if (this.websiteUrl) {
    text += `Website: ${this.websiteUrl}\n`;
  }
  
  if (this.summaryMetrics) {
    text += `Total Visitors: ${this.summaryMetrics.totalVisitors}\n`;
    text += `Unique Visitors: ${this.summaryMetrics.uniqueVisitors}\n`;
    text += `Web3 Visitors: ${this.summaryMetrics.web3Visitors}\n`;
    text += `Page Views: ${this.summaryMetrics.totalPageViews}\n`;
    text += `Wallets Connected: ${this.summaryMetrics.walletsConnected}\n`;
    text += `Average Session Duration: ${this.summaryMetrics.avgSessionDuration} seconds\n`;
    text += `Bounce Rate: ${this.summaryMetrics.bounceRate}%\n`;
  }
  
  // Add page views data
  if (this.pageViews && this.pageViews.size > 0) {
    text += 'Page Views:\n';
    for (const [page, views] of this.pageViews) {
      text += `${page}: ${views} views\n`;
    }
  }
  
  // Add wallet information
  if (this.wallets && this.wallets.length > 0) {
    text += 'Connected Wallets:\n';
    this.wallets.forEach(wallet => {
      text += `${wallet.walletType} on ${wallet.chainName}\n`;
    });
  }
  
  this.textContent = text;
  return text;
};

// Pre-save middleware to update text content
analyticsSchema.pre('save', function(next) {
  // Generate text content for vector search
  this.generateTextContent();
  
  // Update metadata
  this.metadata.lastProcessed = new Date();
  
  next();
});

const Analytics = mongoose.model("Analytics", analyticsSchema);

module.exports = Analytics;
