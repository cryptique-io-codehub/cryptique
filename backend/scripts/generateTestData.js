const mongoose = require('mongoose');
const Analytics = require('../models/analytics');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../models/stats');
const AnalyticsProcessor = require('../utils/analyticsProcessor');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cryptique', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const generateTestData = async () => {
  try {
    // Clear existing data
    await Analytics.deleteMany({});
    await HourlyStats.deleteMany({});
    await DailyStats.deleteMany({});
    await WeeklyStats.deleteMany({});
    await MonthlyStats.deleteMany({});

    const siteId = 'test-site-1';
    const processor = new AnalyticsProcessor(siteId);

    // Generate data for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Generate hourly data points
    for (let i = 0; i < 30 * 24; i++) {
      const timestamp = new Date(thirtyDaysAgo.getTime() + (i * 60 * 60 * 1000));
      
      // Create analytics document
      const analytics = new Analytics({
        siteId,
        websiteUrl: 'https://test-site.com',
        totalVisitors: Math.floor(Math.random() * 1000) + 100,
        uniqueVisitors: Math.floor(Math.random() * 500) + 50,
        web3Visitors: Math.floor(Math.random() * 300) + 20,
        walletsConnected: Math.floor(Math.random() * 200) + 10,
        totalPageViews: Math.floor(Math.random() * 2000) + 200,
        lastUpdatedAt: timestamp
      });

      await analytics.save();
      await processor.updateStats(analytics._id);

      // Add some random spikes in traffic
      if (Math.random() < 0.1) {
        const spikeAnalytics = new Analytics({
          siteId,
          websiteUrl: 'https://test-site.com',
          totalVisitors: Math.floor(Math.random() * 2000) + 500,
          uniqueVisitors: Math.floor(Math.random() * 1000) + 200,
          web3Visitors: Math.floor(Math.random() * 800) + 100,
          walletsConnected: Math.floor(Math.random() * 400) + 50,
          totalPageViews: Math.floor(Math.random() * 4000) + 500,
          lastUpdatedAt: new Date(timestamp.getTime() + 30 * 60 * 1000)
        });

        await spikeAnalytics.save();
        await processor.updateStats(spikeAnalytics._id);
      }
    }

    console.log('Test data generated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error generating test data:', error);
    process.exit(1);
  }
};

generateTestData(); 