const mongoose = require('mongoose');

// Schema for embedding system statistics and metrics
const embeddingStatsSchema = new mongoose.Schema({
  // Time period for these stats
  period: {
    type: String,
    required: true,
    enum: ['hourly', 'daily', 'weekly', 'monthly'],
    index: true
  },
  
  // Date range for this stats period
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  
  // Team context (null for global stats)
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    index: true,
    sparse: true
  },
  
  // Processing statistics
  processing: {
    // Job statistics
    jobsCreated: {
      type: Number,
      default: 0
    },
    jobsCompleted: {
      type: Number,
      default: 0
    },
    jobsFailed: {
      type: Number,
      default: 0
    },
    jobsCancelled: {
      type: Number,
      default: 0
    },
    
    // Document statistics
    documentsProcessed: {
      type: Number,
      default: 0
    },
    documentsCreated: {
      type: Number,
      default: 0
    },
    documentsUpdated: {
      type: Number,
      default: 0
    },
    documentsSkipped: {
      type: Number,
      default: 0
    },
    
    // Performance metrics
    averageProcessingTime: {
      type: Number,
      default: 0
    },
    totalProcessingTime: {
      type: Number,
      default: 0
    },
    averageJobDuration: {
      type: Number,
      default: 0
    },
    
    // Queue metrics
    averageQueueTime: {
      type: Number,
      default: 0
    },
    maxQueueLength: {
      type: Number,
      default: 0
    },
    
    // Error statistics
    totalErrors: {
      type: Number,
      default: 0
    },
    errorRate: {
      type: Number,
      default: 0
    },
    
    // Retry statistics
    totalRetries: {
      type: Number,
      default: 0
    },
    retrySuccessRate: {
      type: Number,
      default: 0
    }
  },
  
  // API usage statistics
  apiUsage: {
    // Gemini API calls
    totalApiCalls: {
      type: Number,
      default: 0
    },
    successfulApiCalls: {
      type: Number,
      default: 0
    },
    failedApiCalls: {
      type: Number,
      default: 0
    },
    apiSuccessRate: {
      type: Number,
      default: 0
    },
    
    // Token usage
    totalTokensUsed: {
      type: Number,
      default: 0
    },
    averageTokensPerRequest: {
      type: Number,
      default: 0
    },
    
    // Rate limiting
    rateLimitHits: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    
    // Cost tracking
    totalCost: {
      type: Number,
      default: 0
    },
    averageCostPerDocument: {
      type: Number,
      default: 0
    }
  },
  
  // Storage statistics
  storage: {
    // Vector documents
    totalVectorDocuments: {
      type: Number,
      default: 0
    },
    activeVectorDocuments: {
      type: Number,
      default: 0
    },
    archivedVectorDocuments: {
      type: Number,
      default: 0
    },
    
    // Storage size
    totalStorageSize: {
      type: Number,
      default: 0
    },
    averageDocumentSize: {
      type: Number,
      default: 0
    },
    
    // Index performance
    indexSize: {
      type: Number,
      default: 0
    },
    averageQueryTime: {
      type: Number,
      default: 0
    }
  },
  
  // Search statistics
  search: {
    // Query statistics
    totalQueries: {
      type: Number,
      default: 0
    },
    successfulQueries: {
      type: Number,
      default: 0
    },
    failedQueries: {
      type: Number,
      default: 0
    },
    
    // Performance metrics
    averageSearchTime: {
      type: Number,
      default: 0
    },
    averageResultsReturned: {
      type: Number,
      default: 0
    },
    
    // Relevance metrics
    averageRelevanceScore: {
      type: Number,
      default: 0
    },
    
    // Cache statistics
    cacheHits: {
      type: Number,
      default: 0
    },
    cacheMisses: {
      type: Number,
      default: 0
    },
    cacheHitRate: {
      type: Number,
      default: 0
    }
  },
  
  // Source type breakdown
  sourceTypeBreakdown: {
    analytics: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    transaction: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    session: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    campaign: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    website: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    user_journey: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    },
    smart_contract: {
      documents: { type: Number, default: 0 },
      processingTime: { type: Number, default: 0 },
      cost: { type: Number, default: 0 }
    }
  },
  
  // System health metrics
  system: {
    // Worker statistics
    activeWorkers: {
      type: Number,
      default: 0
    },
    averageWorkerUtilization: {
      type: Number,
      default: 0
    },
    
    // Memory usage
    averageMemoryUsage: {
      type: Number,
      default: 0
    },
    peakMemoryUsage: {
      type: Number,
      default: 0
    },
    
    // Database performance
    averageDbResponseTime: {
      type: Number,
      default: 0
    },
    dbConnectionsUsed: {
      type: Number,
      default: 0
    }
  },
  
  // Quality metrics
  quality: {
    // User feedback
    totalFeedback: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    
    // Content quality
    averageContentLength: {
      type: Number,
      default: 0
    },
    averageChunksPerDocument: {
      type: Number,
      default: 0
    },
    
    // Embedding quality
    averageEmbeddingConfidence: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'embeddingstats'
});

// Compound indexes for efficient queries
// Note: The unique index below covers the first index, so we don't need both
embeddingStatsSchema.index({ teamId: 1, period: 1, startDate: -1 });
embeddingStatsSchema.index({ startDate: 1, endDate: 1 });

// Unique constraint to prevent duplicate stats for same period
embeddingStatsSchema.index(
  { period: 1, startDate: 1, teamId: 1 },
  { unique: true, sparse: true }
);

// TTL index for old stats (auto-delete after 1 year)
embeddingStatsSchema.index({ 
  createdAt: 1 
}, { 
  expireAfterSeconds: 365 * 24 * 60 * 60 // 1 year
});

// Pre-save middleware to calculate derived metrics
embeddingStatsSchema.pre('save', function(next) {
  const stats = this;
  
  // Calculate processing rates
  if (stats.processing.jobsCreated > 0) {
    stats.processing.errorRate = (stats.processing.jobsFailed / stats.processing.jobsCreated) * 100;
  }
  
  // Calculate API success rate
  if (stats.apiUsage.totalApiCalls > 0) {
    stats.apiUsage.apiSuccessRate = (stats.apiUsage.successfulApiCalls / stats.apiUsage.totalApiCalls) * 100;
  }
  
  // Calculate average tokens per request
  if (stats.apiUsage.successfulApiCalls > 0) {
    stats.apiUsage.averageTokensPerRequest = stats.apiUsage.totalTokensUsed / stats.apiUsage.successfulApiCalls;
  }
  
  // Calculate average cost per document
  if (stats.processing.documentsProcessed > 0) {
    stats.apiUsage.averageCostPerDocument = stats.apiUsage.totalCost / stats.processing.documentsProcessed;
  }
  
  // Calculate cache hit rate
  const totalCacheRequests = stats.search.cacheHits + stats.search.cacheMisses;
  if (totalCacheRequests > 0) {
    stats.search.cacheHitRate = (stats.search.cacheHits / totalCacheRequests) * 100;
  }
  
  // Calculate retry success rate
  if (stats.processing.totalRetries > 0) {
    stats.processing.retrySuccessRate = ((stats.processing.totalRetries - stats.processing.jobsFailed) / stats.processing.totalRetries) * 100;
  }
  
  next();
});

// Static methods for aggregation and reporting
embeddingStatsSchema.statics.getTeamStats = function(teamId, period, limit = 10) {
  return this.find({ teamId, period })
    .sort({ startDate: -1 })
    .limit(limit);
};

embeddingStatsSchema.statics.getGlobalStats = function(period, limit = 10) {
  return this.find({ teamId: null, period })
    .sort({ startDate: -1 })
    .limit(limit);
};

embeddingStatsSchema.statics.getUsageTrends = function(teamId, days = 30) {
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        teamId: teamId ? new mongoose.Types.ObjectId(teamId) : null,
        period: 'daily',
        startDate: { $gte: startDate }
      }
    },
    {
      $sort: { startDate: 1 }
    },
    {
      $project: {
        date: '$startDate',
        documentsProcessed: '$processing.documentsProcessed',
        totalCost: '$apiUsage.totalCost',
        apiCalls: '$apiUsage.totalApiCalls',
        errorRate: '$processing.errorRate',
        averageProcessingTime: '$processing.averageProcessingTime'
      }
    }
  ]);
};

embeddingStatsSchema.statics.getCostBreakdown = function(teamId, period = 'monthly', limit = 12) {
  return this.aggregate([
    {
      $match: {
        teamId: teamId ? new mongoose.Types.ObjectId(teamId) : null,
        period: period
      }
    },
    {
      $sort: { startDate: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        period: '$startDate',
        totalCost: '$apiUsage.totalCost',
        documentsProcessed: '$processing.documentsProcessed',
        costPerDocument: '$apiUsage.averageCostPerDocument',
        sourceBreakdown: '$sourceTypeBreakdown'
      }
    }
  ]);
};

embeddingStatsSchema.statics.getPerformanceMetrics = function(teamId, hours = 24) {
  const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        teamId: teamId ? new mongoose.Types.ObjectId(teamId) : null,
        period: 'hourly',
        startDate: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgProcessingTime: { $avg: '$processing.averageProcessingTime' },
        avgSearchTime: { $avg: '$search.averageSearchTime' },
        avgApiResponseTime: { $avg: '$apiUsage.averageResponseTime' },
        totalDocuments: { $sum: '$processing.documentsProcessed' },
        totalErrors: { $sum: '$processing.totalErrors' },
        avgErrorRate: { $avg: '$processing.errorRate' }
      }
    }
  ]);
};

const EmbeddingStats = mongoose.model('EmbeddingStats', embeddingStatsSchema);

module.exports = EmbeddingStats; 