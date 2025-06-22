const mongoose = require('mongoose');

const granularEventSchema = new mongoose.Schema({
  siteId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  sessionId: { type: String, required: true },
  eventType: { type: String, required: true },
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
  timestamp: { type: Date, required: true, default: Date.now, index: true }
}, { timestamps: true });

// Create compound indexes for efficient querying
granularEventSchema.index({ siteId: 1, eventType: 1 });
granularEventSchema.index({ siteId: 1, pagePath: 1 });
granularEventSchema.index({ siteId: 1, timestamp: 1 });

const GranularEvent = mongoose.model('GranularEvent', granularEventSchema);

module.exports = GranularEvent; 