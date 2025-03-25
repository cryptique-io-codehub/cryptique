const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
    {
        countryName: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;