const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { 
  findWithRetry, 
  findOneWithRetry, 
  updateOneWithRetry, 
  saveWithRetry, 
  deleteOneWithRetry, 
  aggregateWithRetry 
} = require('../utils/dbOperations');

const TeamSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    email: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'offchain', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pastdue', 'cancelled', 'trial'],
      default: 'inactive'
    },
    startDate: Date,
    endDate: Date,
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    cqIntelligence: {
      type: Boolean,
      default: false
    },
    limits: {
      websites: {
        type: Number,
        default: 0
      },
      smartContracts: {
        type: Number,
        default: 0
      },
      apiCalls: {
        type: Number,
        default: 0
      },
      teamMembers: {
        type: Number,
        default: 1
      }
    },
    customPlanDetails: {
      type: Schema.Types.Mixed
    }
  },
  // Track current usage for limits
  usage: {
    websites: {
      type: Number,
      default: 0
    },
    smartContracts: {
      type: Number,
      default: 0
    },
    apiCalls: {
      type: Number,
      default: 0,
      // Reset at the beginning of each billing cycle
    },
    teamMembers: {
      type: Number,
      default: 1  // Owner counts as 1
    },
    // Track usage reset date to manage monthly API call limits
    lastResetDate: {
      type: Date,
      default: Date.now
    }
  },
  // Data retention fields
  dataDeletionScheduled: {
    type: Boolean,
    default: false
  },
  dataDeletionDate: Date,
  dataDeleted: {
    type: Boolean,
    default: false
  },
  dataDeletionExecutedDate: Date,
  dataBackupRetentionDate: Date,
  dataRetentionNotificationSent: {
    type: Boolean,
    default: false
  },
  stripeCustomerId: {
    type: String
  },
  zohoDetails: {
    accountId: String,
    contactId: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp before saving
TeamSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static methods with retry logic
TeamSchema.statics = {
  /**
   * Find a team by ID with retry
   * @param {string} id - Team ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Team document
   */
  findByIdWithRetry: async function(id, options = {}) {
    return findOneWithRetry(this, { _id: id }, options);
  },

  /**
   * Find teams with expired subscriptions for data retention processing
   * @param {number} gracePeriodDays - Number of days in grace period
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of team documents
   */
  findTeamsWithExpiredSubscriptionsWithRetry: async function(gracePeriodDays, options = {}) {
    const now = new Date();
    const gracePeriodDate = new Date(now.getTime() - (gracePeriodDays * 24 * 60 * 60 * 1000));
    
    // Extract pagination options
    const { skip = 0, limit = 10 } = options;
    
    // Build query
    const query = {
      'subscription.status': { $in: ['inactive', 'pastdue', 'cancelled'] },
      'subscription.endDate': { $lt: gracePeriodDate },
      'dataDeletionScheduled': { $exists: false }
    };

    // Apply pagination with skip and limit
    return findWithRetry(this, query, {
      mongooseOptions: {
        skip,
        limit,
        sort: { 'subscription.endDate': 1 } // Sort by oldest first
      }
    });
  },
  
  /**
   * Mark team for data deletion with retry
   * @param {string} teamId - Team ID
   * @param {Date} deletionDate - Scheduled deletion date
   * @returns {Promise<Object>} - Update result
   */
  markForDeletionWithRetry: async function(teamId, deletionDate) {
    return updateOneWithRetry(this, 
      { _id: teamId },
      {
        dataDeletionScheduled: true,
        dataDeletionDate: deletionDate,
        dataRetentionNotificationSent: false
      }
    );
  },
  
  /**
   * Find teams scheduled for deletion with retry
   * @param {Object} options - Pagination options
   * @returns {Promise<Array>} - Array of team documents
   */
  findTeamsScheduledForDeletionWithRetry: async function(options = {}) {
    const now = new Date();
    
    // Extract pagination options
    const { skip = 0, limit = 10 } = options;
    
    // Build query
    const query = {
      dataDeletionScheduled: true,
      dataDeletionDate: { $lt: now }
    };
    
    // Apply pagination with skip and limit
    return findWithRetry(this, query, {
      mongooseOptions: {
        skip,
        limit,
        sort: { dataDeletionDate: 1 } // Process oldest scheduled deletions first
      }
    });
  },
  
  /**
   * Mark team data as deleted with retry
   * @param {string} teamId - Team ID
   * @param {Date} backupRetentionDate - Date until backup is retained
   * @returns {Promise<Object>} - Update result
   */
  markDataAsDeletedWithRetry: async function(teamId, backupRetentionDate) {
    const now = new Date();
    return updateOneWithRetry(this, 
      { _id: teamId },
      {
        dataDeletionScheduled: false,
        dataDeleted: true,
        dataDeletionExecutedDate: now,
        dataBackupRetentionDate: backupRetentionDate,
        'usage.websites': 0,
        'usage.smartContracts': 0,
        'usage.apiCalls': 0
      }
    );
  },
  
  /**
   * Get dashboard summary for all teams with retry
   * Useful for admin dashboard
   * @returns {Promise<Array>} - Aggregation result
   */
  getDashboardSummaryWithRetry: async function() {
    const pipeline = [
      {
        $group: {
          _id: '$subscription.plan',
          count: { $sum: 1 },
          activeCount: {
            $sum: {
              $cond: [{ $eq: ['$subscription.status', 'active'] }, 1, 0]
            }
          },
          totalWebsites: { $sum: '$usage.websites' },
          totalSmartContracts: { $sum: '$usage.smartContracts' },
          totalApiCalls: { $sum: '$usage.apiCalls' }
        }
      }
    ];
    
    return aggregateWithRetry(this, pipeline);
  }
};

module.exports = mongoose.model('Team', TeamSchema); 