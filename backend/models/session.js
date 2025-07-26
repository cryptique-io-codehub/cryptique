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
        walletAddress: { type: String, default: "" },
        walletType: { type: String, default: "" },
        chainName: { type: String, default: "" }
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
    isWeb3User: { type: Boolean, default: false },
    
    // New fields for enhanced user journey tracking
    sessionNumber: { type: Number, default: 1 }, // Tracks which session number this is for the user (1st, 2nd, etc.)
    previousSessionId: { type: String }, // Reference to the user's previous session
    timeSinceLastSession: { type: Number }, // Time in seconds since user's last session
    entryPage: { type: String }, // First page of the session
    exitPage: { type: String }, // Last page of the session
    
    // Track visited pages
    visitedPages: [{
        path: { type: String },
        timestamp: { type: Date },
        duration: { type: Number },
        isEntry: { type: Boolean, default: false },
        isExit: { type: Boolean, default: false }
    }]
}, { timestamps: true });

// Add index for sessionId and userId
sessionSchema.index({ sessionId: 1, userId: 1 }, { unique: true });

// Add performance indexes for analytics queries
sessionSchema.index({ siteId: 1, startTime: -1 }); // Primary analytics query index
sessionSchema.index({ siteId: 1, isWeb3User: 1, startTime: -1 }); // Web3 analytics
sessionSchema.index({ siteId: 1, country: 1, startTime: -1 }); // Geographic analytics
sessionSchema.index({ siteId: 1, 'utmData.source': 1, startTime: -1 }); // Traffic source analytics
sessionSchema.index({ siteId: 1, referrer: 1, startTime: -1 }); // Referrer analytics
sessionSchema.index({ userId: 1, siteId: 1, startTime: -1 }); // User journey analytics

// Pre-save middleware to update session data
sessionSchema.pre('save', function(next) {
    // First check wallet data to determine isWeb3User
    if (this.wallet) {
        const hasValidWallet = 
            (this.wallet.walletAddress && this.wallet.walletAddress !== "" && this.wallet.walletAddress !== "No Wallet Detected") ||
            (this.wallet.walletType && this.wallet.walletType !== "" && this.wallet.walletType !== "No Wallet Detected") ||
            (this.wallet.chainName && this.wallet.chainName !== "" && this.wallet.chainName !== "No Wallet Detected");
        
        this.isWeb3User = hasValidWallet;
    }

    // Calculate duration if we have both start and end times
    if (this.startTime && this.endTime) {
        const startDate = new Date(this.startTime);
        const endDate = new Date(this.endTime);
        this.duration = Math.round((endDate - startDate) / 1000);
    }

    // Update isBounce based on duration and pages viewed
    this.isBounce = this.duration < 30 && this.pagesViewed <= 1;

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
    
    // Set entry page based on first visited page
    if (this.visitedPages.length > 0 && !this.entryPage) {
        this.entryPage = this.visitedPages[0].path;
        this.visitedPages[0].isEntry = true;
    }
    
    // Set exit page based on last visited page
    if (this.visitedPages.length > 0) {
        this.exitPage = this.visitedPages[this.visitedPages.length - 1].path;
        this.visitedPages[this.visitedPages.length - 1].isExit = true;
    }
    
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
    // Update the previous exit page to no longer be an exit
    if (this.visitedPages.length > 0) {
        this.visitedPages[this.visitedPages.length - 1].isExit = false;
    }
    
    // If this is the first page view, mark it as entry
    const isEntry = this.visitedPages.length === 0;
    
    this.pagesViewed++;
    
    // Update isBounce based on EITHER duration >= 30 seconds OR more than 1 page view
    this.isBounce = this.duration < 30 && this.pagesViewed <= 1;
    
    // Add the new page view
    this.visitedPages.push({
        path: pagePath,
        timestamp: new Date(),
        duration: 0, // Will be updated on next page view
        isEntry: isEntry,
        isExit: true // Mark as exit until another page is viewed
    });
    
    // Update entry and exit pages
    if (isEntry) {
        this.entryPage = pagePath;
    }
    this.exitPage = pagePath;
    
    await this.save();
};

// Add a static method to find previous session of a user
sessionSchema.statics.findPreviousSession = async function(userId, siteId, currentSessionStartTime) {
    return this.findOne({
        userId: userId,
        siteId: siteId,
        startTime: { $lt: currentSessionStartTime }
    }).sort({ startTime: -1 });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;