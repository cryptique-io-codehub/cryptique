const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    userId: { type: String, required: true },
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
    pagesViewed: { type: Number },
    duration: { type: Number },
    isBounce: { type: Boolean },
    country: { type: String },
    browser: {
        name: { type: String },
        version: { type: String },
    },
    device: {
        type: { type: Object },
    },
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;