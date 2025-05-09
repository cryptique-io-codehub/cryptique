const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Off-chain', 'Basic', 'Pro', 'Enterprise', 'CQ-Intelligence-Addon']
  },
  price: {
    type: Number,
    required: true
  },
  period: {
    type: String,
    enum: ['monthly', 'yearly', 'custom'],
    default: 'monthly'
  },
  description: {
    type: String,
    required: true
  },
  features: {
    maxWebsites: { type: Number, default: 1 },
    maxSmartContracts: { type: Number, default: 0 },
    maxApiCalls: { type: Number, default: 0 },
    maxTeamMembers: { type: Number, default: 1 },
    hasOffChainAnalytics: { type: Boolean, default: true },
    hasOnChainAnalytics: { type: Boolean, default: false },
    hasCQIntelligence: { type: Boolean, default: false }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

module.exports = SubscriptionPlan; 