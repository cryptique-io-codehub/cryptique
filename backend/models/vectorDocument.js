const mongoose = require('mongoose');

// Schema for storing vector embeddings with metadata
const vectorDocumentSchema = new mongoose.Schema({
  // Unique identifier for the document
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Source information
  sourceType: {
    type: String,
    required: true,
    enum: ['analytics', 'transaction', 'session', 'campaign', 'website', 'user_journey', 'smart_contract'],
    index: true
  },
  
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  
  // Site and team context
  siteId: {
    type: String,
    required: true,
    index: true
  },
  
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Team',
    index: true
  },
  
  // Vector embedding (768 dimensions for Gemini text-embedding-004)
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 768; // Gemini embedding dimension
      },
      message: 'Embedding must have exactly 768 dimensions'
    }
  },
  
  // Original content that was embedded
  content: {
    type: String,
    required: true,
    maxlength: 8000 // Reasonable limit for content
  },
  
  // Content summary for quick reference
  summary: {
    type: String,
    maxlength: 500
  },
  
  // Metadata for context and filtering
  metadata: {
    // Time context
    timeframe: {
      start: Date,
      end: Date
    },
    
    // Data context
    dataType: {
      type: String,
      enum: ['metric', 'event', 'journey', 'transaction', 'campaign', 'insight']
    },
    
    // Relevance context
    tags: [String],
    category: String,
    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    
    // Chain context for blockchain data
    chainId: String,
    contractAddress: String,
    
    // Analytics context
    metricType: String,
    aggregationLevel: {
      type: String,
      enum: ['raw', 'hourly', 'daily', 'weekly', 'monthly']
    },
    
    // User context
    userSegment: String,
    deviceType: String,
    
    // Performance metrics
    processingTime: Number, // Time taken to generate embedding
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    }
  },
  
  // Version control
  version: {
    type: Number,
    default: 1
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'archived', 'deprecated'],
    default: 'active',
    index: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Expiry for data retention
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  collection: 'vectordocuments'
});

// Compound indexes for efficient queries
vectorDocumentSchema.index({ teamId: 1, siteId: 1, sourceType: 1 });
vectorDocumentSchema.index({ teamId: 1, createdAt: -1 });
vectorDocumentSchema.index({ sourceType: 1, 'metadata.dataType': 1 });
vectorDocumentSchema.index({ 'metadata.timeframe.start': 1, 'metadata.timeframe.end': 1 });
vectorDocumentSchema.index({ 'metadata.tags': 1 });
vectorDocumentSchema.index({ status: 1, createdAt: -1 });

// Text index for content search
vectorDocumentSchema.index({ 
  content: 'text', 
  summary: 'text', 
  'metadata.tags': 'text' 
});

// Pre-save middleware to update timestamps
vectorDocumentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
vectorDocumentSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

vectorDocumentSchema.methods.deprecate = function() {
  this.status = 'deprecated';
  return this.save();
};

// Static methods for common queries
vectorDocumentSchema.statics.findByTeamAndSite = function(teamId, siteId) {
  return this.find({ teamId, siteId, status: 'active' });
};

vectorDocumentSchema.statics.findBySourceType = function(sourceType, teamId) {
  return this.find({ sourceType, teamId, status: 'active' });
};

vectorDocumentSchema.statics.findByTimeframe = function(startDate, endDate, teamId) {
  return this.find({
    teamId,
    status: 'active',
    'metadata.timeframe.start': { $gte: startDate },
    'metadata.timeframe.end': { $lte: endDate }
  });
};

const VectorDocument = mongoose.model('VectorDocument', vectorDocumentSchema);

module.exports = VectorDocument; 