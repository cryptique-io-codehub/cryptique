const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PaymentSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['crypto', 'card', 'bank_transfer', 'other'],
    default: 'crypto'
  },
  planType: {
    type: String,
    enum: ['offchain', 'basic', 'pro', 'enterprise', 'cq_intelligence_addon'],
    required: true
  },
  billingPeriod: {
    type: String,
    enum: ['monthly', 'annual', 'custom'],
    default: 'monthly'
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  coinbaseData: {
    chargeId: String,
    checkoutId: String,
    webhookId: String,
    paymentDetails: Schema.Types.Mixed
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
PaymentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema); 