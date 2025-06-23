const mongoose = require('mongoose');

// Schema for tracking embedding processing jobs
const embeddingJobSchema = new mongoose.Schema({
  // Job identification
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Job type and priority
  jobType: {
    type: String,
    required: true,
    enum: ['initial_processing', 'reprocessing', 'batch_update', 'migration'],
    index: true
  },
  
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5,
    index: true
  },
  
  // Source data information
  sourceType: {
    type: String,
    required: true,
    enum: ['analytics', 'transaction', 'session', 'campaign', 'website', 'user_journey', 'smart_contract'],
    index: true
  },
  
  sourceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    required: true
  }],
  
  // Team and site context
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Team',
    index: true
  },
  
  siteId: {
    type: String,
    index: true
  },
  
  // Job status and progress
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'],
    default: 'pending',
    index: true
  },
  
  progress: {
    total: {
      type: Number,
      required: true,
      min: 0
    },
    processed: {
      type: Number,
      default: 0,
      min: 0
    },
    failed: {
      type: Number,
      default: 0,
      min: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Execution details
  startedAt: Date,
  completedAt: Date,
  estimatedCompletionAt: Date,
  
  // Processing configuration
  config: {
    batchSize: {
      type: Number,
      default: 10,
      min: 1,
      max: 100
    },
    chunkSize: {
      type: Number,
      default: 1000,
      min: 100,
      max: 8000
    },
    overlapSize: {
      type: Number,
      default: 200,
      min: 0,
      max: 1000
    },
    embeddingModel: {
      type: String,
      default: 'gemini-embedding',
      enum: ['gemini-embedding']
    }
  },
  
  // Results and metrics
  results: {
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
    totalTokensUsed: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0
    },
    averageProcessingTime: {
      type: Number,
      default: 0
    }
  },
  
  // Error handling
  errors: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    sourceId: mongoose.Schema.Types.ObjectId,
    error: String,
    errorCode: String,
    retryCount: {
      type: Number,
      default: 0
    }
  }],
  
  // Retry configuration
  retryConfig: {
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10
    },
    retryCount: {
      type: Number,
      default: 0
    },
    nextRetryAt: Date,
    backoffMultiplier: {
      type: Number,
      default: 2,
      min: 1,
      max: 10
    }
  },
  
  // Scheduling
  scheduledFor: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Dependencies
  dependsOn: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmbeddingJob'
  }],
  
  // Worker information
  workerId: String,
  workerHost: String,
  
  // Metadata
  metadata: {
    triggeredBy: String, // user, system, migration, etc.
    reason: String,
    tags: [String],
    notes: String
  }
}, {
  timestamps: true,
  collection: 'embeddingjobs'
});

// Compound indexes for efficient queries
embeddingJobSchema.index({ status: 1, priority: -1, scheduledFor: 1 });
embeddingJobSchema.index({ teamId: 1, status: 1, createdAt: -1 });
embeddingJobSchema.index({ sourceType: 1, status: 1 });
embeddingJobSchema.index({ workerId: 1, status: 1 });
embeddingJobSchema.index({ 'retryConfig.nextRetryAt': 1 });

// TTL index for completed jobs (auto-delete after 30 days)
embeddingJobSchema.index({ 
  completedAt: 1 
}, { 
  expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
  partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } }
});

// Pre-save middleware to calculate percentage
embeddingJobSchema.pre('save', function(next) {
  if (this.progress.total > 0) {
    this.progress.percentage = Math.round((this.progress.processed / this.progress.total) * 100);
  }
  
  // Update estimated completion time
  if (this.status === 'processing' && this.progress.processed > 0) {
    const elapsed = Date.now() - this.startedAt.getTime();
    const rate = this.progress.processed / elapsed;
    const remaining = this.progress.total - this.progress.processed;
    this.estimatedCompletionAt = new Date(Date.now() + (remaining / rate));
  }
  
  next();
});

// Instance methods
embeddingJobSchema.methods.start = function() {
  this.status = 'processing';
  this.startedAt = new Date();
  return this.save();
};

embeddingJobSchema.methods.complete = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.processed = this.progress.total; // Set processed to total
  this.progress.percentage = 100;
  return this.save();
};

embeddingJobSchema.methods.fail = function(error) {
  this.status = 'failed';
  this.completedAt = new Date();
  if (error) {
    this.errors.push({
      timestamp: new Date(),
      error: error.message || error,
      errorCode: error.code
    });
  }
  return this.save();
};

embeddingJobSchema.methods.retry = function() {
  if (this.retryConfig.retryCount < this.retryConfig.maxRetries) {
    this.retryConfig.retryCount++;
    this.retryConfig.nextRetryAt = new Date(
      Date.now() + (Math.pow(this.retryConfig.backoffMultiplier, this.retryConfig.retryCount) * 60000)
    );
    this.status = 'retrying';
    return this.save();
  }
  return Promise.reject(new Error('Maximum retries exceeded'));
};

embeddingJobSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.completedAt = new Date();
  return this.save();
};

embeddingJobSchema.methods.updateProgress = function(processed, failed = 0) {
  this.progress.processed = processed;
  this.progress.failed = failed;
  return this.save();
};

// Static methods
embeddingJobSchema.statics.getNextJob = function() {
  return this.findOneAndUpdate(
    {
      status: 'pending',
      scheduledFor: { $lte: new Date() }
    },
    { status: 'processing', startedAt: new Date() },
    { sort: { priority: -1, scheduledFor: 1 }, new: true }
  );
};

embeddingJobSchema.statics.getJobsForRetry = function() {
  return this.find({
    status: 'retrying',
    'retryConfig.nextRetryAt': { $lte: new Date() }
  });
};

embeddingJobSchema.statics.getActiveJobs = function() {
  return this.find({
    status: { $in: ['pending', 'processing', 'retrying'] }
  });
};

embeddingJobSchema.statics.getJobStats = function(teamId, days = 7) {
  const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  return this.aggregate([
    {
      $match: {
        teamId: new mongoose.Types.ObjectId(teamId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProcessingTime: { $avg: '$results.averageProcessingTime' },
        totalDocuments: { $sum: '$results.documentsCreated' },
        totalCost: { $sum: '$results.totalCost' }
      }
    }
  ]);
};

const EmbeddingJob = mongoose.model('EmbeddingJob', embeddingJobSchema);

module.exports = EmbeddingJob; 