const mongoose = require("mongoose");

const teamSubscriptionSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan",
    required: true
  },
  addons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubscriptionPlan"
  }],
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'trialing', 'pending'],
    default: 'pending'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  trialEndsAt: {
    type: Date
  },
  coinbaseChargeId: {
    type: String
  },
  coinbaseCustomerId: {
    type: String
  },
  billingDetails: {
    companyName: String,
    address: String,
    city: String,
    zipCode: String,
    country: String,
    isRegisteredCompany: Boolean
  },
  apiCallsUsed: {
    type: Number,
    default: 0
  },
  paymentHistory: [{
    transactionId: String,
    amount: Number,
    status: String,
    date: Date,
    paymentMethod: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

teamSubscriptionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const TeamSubscription = mongoose.model('TeamSubscription', teamSubscriptionSchema);

module.exports = TeamSubscription; 