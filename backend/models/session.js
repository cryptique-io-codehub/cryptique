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
        utm_id: { type: String }
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
    lastActivity: { type: Date },
    country: { type: String },
    browser: {
        name: { type: String },
        version: { type: String },
    },
    device: {
        type: { type: String },
        os: { type: String },
    },
    // Track visited pages
    visitedPages: [{
        path: { type: String },
        timestamp: { type: Date },
        duration: { type: Number }
    }]
}, { timestamps: true });

// Add index for sessionId and userId
sessionSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

// Pre-save middleware to update session data
sessionSchema.pre('save', function(next) {
    // Always use lastActivity for duration calculation if available
    if (this.lastActivity) {
        this.duration = Math.floor((this.lastActivity - this.startTime) / 1000);
        // Ensure endTime matches lastActivity
        this.endTime = this.lastActivity;
    } else if (this.endTime) {
        this.duration = Math.floor((this.endTime - this.startTime) / 1000);
    }
    
    // Update pagesViewed based on visitedPages length
    this.pagesViewed = this.visitedPages.length;
    
    // Update isBounce based on EITHER duration >= 30 seconds OR more than 1 page view
    this.isBounce = this.duration < 30 && this.pagesViewed <= 1;
    
    next();
});

// Method to update session activity
sessionSchema.methods.updateActivity = function() {
    const now = new Date();
    this.lastActivity = now;
    this.endTime = now;
    return this.save();
};

// Method to add a page view
sessionSchema.methods.addPageView = async function(pagePath) {
    this.pagesViewed++;
    // Update isBounce based on EITHER duration >= 30 seconds OR more than 1 page view
    this.isBounce = this.duration < 30 && this.pagesViewed <= 1;
    this.visitedPages.push({
        path: pagePath,
        timestamp: new Date(),
        duration: 0 // Will be updated on next page view
    });
    await this.save();
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;