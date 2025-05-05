const mongoose = require('mongoose');

// Define schema for single page visit within a session
const PageVisitSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    default: 0
  },
  isEntry: {
    type: Boolean,
    default: false
  },
  isExit: {
    type: Boolean,
    default: false
  }
});

// Define schema for session
const SessionSchema = new mongoose.Schema({
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
  sessionNumber: {
    type: Number,
    default: 1
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0
  },
  pagesViewed: {
    type: Number,
    default: 0
  },
  visitedPages: [PageVisitSchema],
  device: {
    type: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    browser: String,
    os: String
  },
  wallet: {
    walletAddress: String,
    walletType: String,
    chainName: String
  },
  country: String,
  referrer: String,
  utmData: {
    source: String,
    medium: String,
    campaign: String
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
  }
});

// Define schema for user journey
const UserJourneySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  firstVisit: {
    type: Date,
    default: Date.now
  },
  lastVisit: {
    type: Date,
    default: Date.now
  },
  totalSessions: {
    type: Number,
    default: 1
  },
  totalPageViews: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number, // in seconds
    default: 0
  },
  hasConverted: {
    type: Boolean,
    default: false
  },
  daysToConversion: Number,
  userSegment: {
    type: String,
    enum: ['converter', 'engaged', 'bounced', 'browser', 'unknown'],
    default: 'unknown'
  },
  acquisitionSource: String,
  sessionsBeforeConversion: Number,
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
  websiteName: String,
  websiteDomain: String
}, {
  timestamps: true
});

// Create models
const UserJourney = mongoose.model('UserJourney', UserJourneySchema);
const Session = mongoose.model('Session', SessionSchema);

module.exports = { UserJourney, Session }; 