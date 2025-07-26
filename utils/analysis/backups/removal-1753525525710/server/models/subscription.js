const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubscriptionSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  stripeCustomerId: {
    type: String,
    required: true
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
    unique: true
  },
  plan: {
    type: String,
    enum: ['offchain', 'basic', 'pro', 'enterprise'],
    required: true
  },
  status: {
    type: String,
    enum: [
      'incomplete', 
      'incomplete_expired', 
      'active', 
      'past_due', 
      'canceled', 
      'unpaid', 
      'trialing'
    ],
    default: 'incomplete'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  canceledAt: Date,
  endedAt: Date,
  addons: [{
    name: {
      type: String,
      enum: ['cq_intelligence'],
      required: true
    },
    stripeSubscriptionItemId: String,
    stripePriceId: String,
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly'
    },
    active: {
      type: Boolean,
      default: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  paymentMethod: {
    type: String,
    required: true
  },
  defaultPaymentMethodId: String,
  invoiceSettings: {
    defaultPaymentMethod: String
  },
  metadata: {
    type: Schema.Types.Mixed
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

// Update timestamp before saving
SubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Subscription', SubscriptionSchema); 