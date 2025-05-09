const mongoose = require('mongoose');
const Schema = mongoose.Schema;

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

module.exports = mongoose.model('Team', TeamSchema); 