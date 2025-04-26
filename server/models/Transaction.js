const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    unique: true
  },
  transactions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lastFetch: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Update the updatedAt field before saving
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema); 