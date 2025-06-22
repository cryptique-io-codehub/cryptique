const mongoose = require('mongoose');

const granularEventSchema = new mongoose.Schema({
  siteId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  eventData: {
    tagName: { type: String },
    id: { type: String },
    className: { type: String },
    innerText: { type: String },
    href: { type: String },
    dataId: { type: String },
    // Additional fields from the general event data
    referrer: { type: String },
    sessionDuration: { type: Number },
    pagesPerVisit: { type: Number },
    isBounce: { type: Boolean },
    browser: { type: Object },
    os: { type: String },
    deviceType: { type: Object },
    resolution: { type: String },
    language: { type: String },
    country: { type: String },
    walletConnected: { type: Boolean }
  },
  pagePath: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  
  // TTL for automatic data cleanup - different retention based on event type
  expiresAt: {
    type: Date,
    default: function() {
      const date = new Date();
      // Different retention periods based on event type
      if (this.eventType === 'pageView') {
        date.setDate(date.getDate() + 60); // 60 days for page views
      } else if (this.eventType === 'walletConnect') {
        date.setDate(date.getDate() + 365); // 1 year for wallet connections
      } else if (this.eventType === 'click') {
        date.setDate(date.getDate() + 90); // 90 days for clicks
      } else {
        date.setDate(date.getDate() + 120); // 120 days default
      }
      return date;
    },
    index: { expires: 0 }
  }
}, { timestamps: true });

// Create compound indexes for efficient querying
granularEventSchema.index({ siteId: 1, eventType: 1, timestamp: -1 });
granularEventSchema.index({ siteId: 1, pagePath: 1, timestamp: -1 });
granularEventSchema.index({ siteId: 1, userId: 1, timestamp: -1 });
granularEventSchema.index({ sessionId: 1, timestamp: 1 });

// Static method to get event analytics
granularEventSchema.statics.getEventAnalytics = async function(siteId, options = {}) {
  const {
    eventType,
    pagePath,
    dateRange = {},
    limit = 100
  } = options;
  
  const matchStage = { siteId };
  
  if (eventType) {
    matchStage.eventType = eventType;
  }
  
  if (pagePath) {
    matchStage.pagePath = pagePath;
  }
  
  if (dateRange.start && dateRange.end) {
    matchStage.timestamp = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          eventType: '$eventType',
          pagePath: '$pagePath'
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueSessions: { $addToSet: '$sessionId' },
        firstEvent: { $min: '$timestamp' },
        lastEvent: { $max: '$timestamp' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueSessionCount: { $size: '$uniqueSessions' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ];
  
  return this.aggregate(pipeline);
};

// Static method to get top events by type
granularEventSchema.statics.getTopEventsByType = async function(siteId, eventType, limit = 10) {
  const pipeline = [
    {
      $match: {
        siteId: siteId,
        eventType: eventType
      }
    },
    {
      $group: {
        _id: {
          tagName: '$eventData.tagName',
          className: '$eventData.className',
          innerText: { $substr: ['$eventData.innerText', 0, 50] } // Truncate for grouping
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        pages: { $addToSet: '$pagePath' }
      }
    },
    {
      $addFields: {
        uniqueUserCount: { $size: '$uniqueUsers' },
        pageCount: { $size: '$pages' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ];
  
  return this.aggregate(pipeline);
};

const GranularEvent = mongoose.model('GranularEvent', granularEventSchema);

module.exports = GranularEvent; 