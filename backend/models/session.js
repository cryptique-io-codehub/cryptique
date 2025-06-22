const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    siteId: { type: String, required: true, index: true },
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
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date },
    pagesViewed: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    isBounce: { type: Boolean, default: true },
    lastActivity: { type: Date },
    country: { type: String, index: true },
    browser: {
        name: { type: String },
        version: { type: String },
    },
    device: {
        type: { type: String },
        os: { type: String },
    },
    isWeb3User: { type: Boolean, default: false, index: true },
    
    // Enhanced user journey tracking
    sessionNumber: { type: Number, default: 1 },
    previousSessionId: { type: String },
    timeSinceLastSession: { type: Number },
    entryPage: { type: String, index: true },
    exitPage: { type: String },
    
    // Track visited pages
    visitedPages: [{
        path: { type: String },
        timestamp: { type: Date },
        duration: { type: Number },
        isEntry: { type: Boolean, default: false },
        isExit: { type: Boolean, default: false }
    }],
    
    // Vector search field for RAG implementation
    contentVector: {
        type: [Number],
        sparse: true,
        select: false
    },
    
    // Text content for vector generation
    textContent: {
        type: String,
        select: false
    },
    
    // TTL for automatic data cleanup - 1 year retention for sessions
    expiresAt: {
        type: Date,
        default: () => {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1);
            return date;
        },
        index: { expires: 0 }
    }
}, { timestamps: true });

// Compound indexes for efficient querying
sessionSchema.index({ sessionId: 1, userId: 1 }, { unique: true });
sessionSchema.index({ siteId: 1, isWeb3User: 1 });
sessionSchema.index({ siteId: 1, startTime: -1 });
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ 'wallet.walletAddress': 1 }, { sparse: true });

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
    
    // Generate text content for vector search
    this.generateTextContent();
    
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

// Instance method to generate text content for vector search
sessionSchema.methods.generateTextContent = function() {
    let text = '';
    
    if (this.siteId) {
        text += `Site ID: ${this.siteId}\n`;
    }
    
    if (this.userId) {
        text += `User ID: ${this.userId}\n`;
    }
    
    if (this.country) {
        text += `Country: ${this.country}\n`;
    }
    
    if (this.browser && this.browser.name) {
        text += `Browser: ${this.browser.name} ${this.browser.version || ''}\n`;
    }
    
    if (this.device && this.device.os) {
        text += `Device: ${this.device.type || 'Unknown'} - ${this.device.os}\n`;
    }
    
    if (this.isWeb3User && this.wallet) {
        text += `Web3 User: ${this.wallet.walletType || 'Unknown'} wallet on ${this.wallet.chainName || 'Unknown'} chain\n`;
    }
    
    text += `Session Duration: ${this.duration} seconds\n`;
    text += `Pages Viewed: ${this.pagesViewed}\n`;
    text += `Bounce: ${this.isBounce ? 'Yes' : 'No'}\n`;
    
    if (this.entryPage) {
        text += `Entry Page: ${this.entryPage}\n`;
    }
    
    if (this.exitPage) {
        text += `Exit Page: ${this.exitPage}\n`;
    }
    
    if (this.utmData && this.utmData.source) {
        text += `Traffic Source: ${this.utmData.source} / ${this.utmData.medium || 'Unknown'}\n`;
        if (this.utmData.campaign) {
            text += `Campaign: ${this.utmData.campaign}\n`;
        }
    }
    
    // Add visited pages information
    if (this.visitedPages && this.visitedPages.length > 0) {
        text += 'Page Journey:\n';
        this.visitedPages.forEach((page, index) => {
            text += `${index + 1}. ${page.path}\n`;
        });
    }
    
    this.textContent = text;
    return text;
};

// Static method to find previous session of a user
sessionSchema.statics.findPreviousSession = async function(userId, siteId, currentSessionStartTime) {
    return this.findOne({
        userId: userId,
        siteId: siteId,
        startTime: { $lt: currentSessionStartTime }
    }).sort({ startTime: -1 });
};

// Static method to get session analytics for a site
sessionSchema.statics.getSessionAnalytics = async function(siteId, dateRange = {}) {
    const matchStage = { siteId };
    
    if (dateRange.start && dateRange.end) {
        matchStage.startTime = {
            $gte: new Date(dateRange.start),
            $lte: new Date(dateRange.end)
        };
    }
    
    const pipeline = [
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                uniqueUsers: { $addToSet: '$userId' },
                web3Sessions: {
                    $sum: { $cond: [{ $eq: ['$isWeb3User', true] }, 1, 0] }
                },
                totalDuration: { $sum: '$duration' },
                totalPageViews: { $sum: '$pagesViewed' },
                bounces: {
                    $sum: { $cond: [{ $eq: ['$isBounce', true] }, 1, 0] }
                },
                avgPagesPerSession: { $avg: '$pagesViewed' },
                countries: { $addToSet: '$country' },
                browsers: { $addToSet: '$browser.name' }
            }
        },
        {
            $addFields: {
                uniqueVisitors: { $size: '$uniqueUsers' },
                avgSessionDuration: {
                    $cond: [
                        { $gt: ['$totalSessions', 0] },
                        { $divide: ['$totalDuration', '$totalSessions'] },
                        0
                    ]
                },
                bounceRate: {
                    $cond: [
                        { $gt: ['$totalSessions', 0] },
                        { $multiply: [{ $divide: ['$bounces', '$totalSessions'] }, 100] },
                        0
                    ]
                },
                web3ConversionRate: {
                    $cond: [
                        { $gt: ['$totalSessions', 0] },
                        { $multiply: [{ $divide: ['$web3Sessions', '$totalSessions'] }, 100] },
                        0
                    ]
                }
            }
        }
    ];
    
    return this.aggregate(pipeline);
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;