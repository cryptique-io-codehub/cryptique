const mongoose = require('mongoose');

const timeseriesStatSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    siteId: {
      type: String,
      required: true,
      index: true
    },
    granularity: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      required: true,
      index: true
    },
    analyticsId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analytics"
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  metrics: {
    visitors: {
      type: Number,
      default: 0
    },
    uniqueVisitors: {
      type: Number,
      default: 0
    },
    web3Users: {
      type: Number,
      default: 0
    },
    walletsConnected: {
      type: Number,
      default: 0
    },
    pageViews: {
      type: Number,
      default: 0
    },
    newVisitors: {
      type: Number,
      default: 0
    },
    returningVisitors: {
      type: Number,
      default: 0
    },
    bounceRate: {
      type: Number,
      default: 0
    },
    avgSessionDuration: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    }
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
  // Enable time series collection optimization
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  }
});

// Compound indexes for efficient querying
timeseriesStatSchema.index({ 
  'metadata.siteId': 1, 
  'metadata.granularity': 1, 
  timestamp: 1 
});

timeseriesStatSchema.index({ 
  'metadata.siteId': 1, 
  timestamp: -1 
});

// Static method to aggregate data by time period
timeseriesStatSchema.statics.aggregateByPeriod = async function(siteId, granularity, startDate, endDate) {
  const pipeline = [
    {
      $match: {
        'metadata.siteId': siteId,
        'metadata.granularity': granularity,
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: granularity === 'hourly' ? '%Y-%m-%d %H:00' : 
                   granularity === 'daily' ? '%Y-%m-%d' :
                   granularity === 'weekly' ? '%Y-W%U' : '%Y-%m',
            date: '$timestamp'
          }
        },
        totalVisitors: { $sum: '$metrics.visitors' },
        totalUniqueVisitors: { $sum: '$metrics.uniqueVisitors' },
        totalWeb3Users: { $sum: '$metrics.web3Users' },
        totalWalletsConnected: { $sum: '$metrics.walletsConnected' },
        totalPageViews: { $sum: '$metrics.pageViews' },
        avgBounceRate: { $avg: '$metrics.bounceRate' },
        avgSessionDuration: { $avg: '$metrics.avgSessionDuration' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get latest stats for a site
timeseriesStatSchema.statics.getLatestStats = async function(siteId, granularity = 'hourly') {
  return this.findOne({
    'metadata.siteId': siteId,
    'metadata.granularity': granularity
  }).sort({ timestamp: -1 });
};

// Instance method to calculate derived metrics
timeseriesStatSchema.methods.calculateDerivedMetrics = function() {
  if (this.metrics.totalSessions > 0) {
    this.metrics.bounceRate = (this.metrics.bounces || 0) / this.metrics.totalSessions * 100;
    this.metrics.avgSessionDuration = (this.metrics.totalSessionTime || 0) / this.metrics.totalSessions;
  }
  
  return this;
};

const TimeseriesStat = mongoose.model('TimeseriesStat', timeseriesStatSchema);

module.exports = TimeseriesStat; 