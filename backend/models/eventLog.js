const mongoose = require('mongoose');

const eventLogSchema = new mongoose.Schema({
  // Core identifiers
  eventId: {
    type: String,
    index: true
  },
  name: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    default: 'custom',
    index: true
  },
  type: {
    type: String,
    required: true,
    default: 'custom',
    index: true
  },
  
  // Session info
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String, 
    required: true,
    index: true
  },
  siteId: {
    type: String,
    required: true,
    index: true
  },
  teamId: {
    type: String,
    required: true,
    index: true
  },
  
  // Page context
  pageUrl: {
    type: String,
    default: ''
  },
  pagePath: {
    type: String,
    default: '',
    index: true
  },
  pageTitle: {
    type: String,
    default: ''
  },
  pageVisitTimestamp: {
    type: Date
  },
  
  // Event data
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  value: {
    type: Number,
    default: null
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Testing and funnel data
  abVariant: {
    type: String,
    default: null,
    index: true
  },
  funnelId: {
    type: String,
    default: null,
    index: true
  },
  funnelStep: {
    type: Number,
    default: null,
    index: true
  },
  
  // Custom metadata (stored as JSON)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Device and browser info
  device: {
    type: {
      type: String,
      enum: ['desktop', 'tablet', 'mobile', 'unknown'],
      default: 'unknown'
    },
    os: String,
    browser: String,
    resolution: String
  },
  
  // Geocoding
  country: {
    type: String,
    default: 'Unknown',
    index: true
  },
  city: String,
  region: String,
  
  // Additional metadata
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Disable auto-updating timestamps since we set them explicitly
  timestamps: false,
  
  // Enable custom _id format for better query performance 
  _id: true,
  
  // Add option to store large objects efficiently
  minimize: false
});

// Create compound indexes for common queries
eventLogSchema.index({ userId: 1, timestamp: -1 });
eventLogSchema.index({ siteId: 1, timestamp: -1 });
eventLogSchema.index({ teamId: 1, timestamp: -1 });
eventLogSchema.index({ siteId: 1, name: 1, timestamp: -1 });
eventLogSchema.index({ siteId: 1, category: 1, timestamp: -1 });
eventLogSchema.index({ funnelId: 1, funnelStep: 1, timestamp: -1 });

module.exports = mongoose.model('EventLog', eventLogSchema); 