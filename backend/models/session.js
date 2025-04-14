const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    siteId: { type: String, required: true },
    referrer: { type: String },
    utmData: {
        source: { type: String },
        medium: { type: String },
        campaign: { type: String },
        term: { type: String },
        content: { type: String },
    },
    wallet: {
        walletAddress: { type: String },
        walletType: { type: String },
        chainName: { type: String },
    },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    pagesViewed: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    isBounce: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now },
    country: { type: String },
    browser: {
        name: { type: String },
        version: { type: String },
    },
    device: {
        type: { type: Object },
    },
    // Track visited pages
    visitedPages: [{
        path: { type: String },
        timestamp: { type: Date },
        duration: { type: Number }
    }]
});

// Add index for faster lookups
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ userId: 1 });
sessionSchema.index({ lastActivity: 1 });

// Method to update session activity
sessionSchema.methods.updateActivity = async function() {
    this.lastActivity = new Date();
    this.duration = Math.round((this.lastActivity - this.startTime) / 1000);
    await this.save();
};

// Method to add a page view
sessionSchema.methods.addPageView = async function(pagePath) {
    this.pagesViewed++;
    this.isBounce = this.pagesViewed <= 1;
    this.visitedPages.push({
        path: pagePath,
        timestamp: new Date(),
        duration: 0 // Will be updated on next page view
    });
    await this.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;