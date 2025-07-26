/**
 * Statistics Aggregation Test Suite
 * Tests for pre-computed statistics functionality
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import services and models
const statsAggregationService = require('../services/statsAggregationService');
const backgroundProcessor = require('../services/backgroundProcessor');
const AggregatedStats = require('../models/aggregatedStats');
const Session = require('../models/session');
const Analytics = require('../models/analytics');
const cacheService = require('../services/cacheService');

describe('Statistics Aggregation System', () => {
  let mongoServer;
  let testSiteId;
  let testSessions;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    testSiteId = 'test-site-123';
    console.log('🧪 Test database connected');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('🧪 Test database disconnected');
  });

  beforeEach(async () => {
    // Clear all collections
    await Session.deleteMany({});
    await Analytics.deleteMany({});
    await AggregatedStats.deleteMany({});
    await cacheService.clear();

    // Create test data
    await createTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await Session.deleteMany({});
    await Analytics.deleteMany({});
    await AggregatedStats.deleteMany({});
    await cacheService.clear();
  });

  /**
   * Create test data for aggregation tests
   */
  async function createTestData() {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    testSessions = [
      // Yesterday's sessions
      {
        siteId: testSiteId,
        userId: 'user1',
        startTime: yesterday,
        duration: 300000, // 5 minutes
        pagesViewed: 3,
        isBounce: false,
        isWeb3User: true,
        wallet: { walletAddress: '0x123...abc' },
        utmData: { source: 'google' },
        device: { type: 'desktop' },
        browser: { name: 'chrome' },
        country: 'US',
        visitedPages: [
          { path: '/', duration: 120000, isEntry: true, isExit: false },
          { path: '/about', duration: 100000, isEntry: false, isExit: false },
          { path: '/contact', duration: 80000, isEntry: false, isExit: true }
        ]
      },
      {
        siteId: testSiteId,
        userId: 'user2',
        startTime: yesterday,
        duration: 60000, // 1 minute
        pagesViewed: 1,
        isBounce: true,
        isWeb3User: false,
        wallet: { walletAddress: 'No Wallet Detected' },
        utmData: { source: 'facebook' },
        device: { type: 'mobile' },
        browser: { name: 'safari' },
        country: 'CA',
        visitedPages: [
          { path: '/', duration: 60000, isEntry: true, isExit: true }
        ]
      },
      {
        siteId: testSiteId,
        userId: 'user3',
        startTime: yesterday,
        duration: 450000, // 7.5 minutes
        pagesViewed: 5,
        isBounce: false,
        isWeb3User: true,
        wallet: { walletAddress: '0x456...def' },
        utmData: { source: 'twitter' },
        device: { type: 'desktop' },
        browser: { name: 'firefox' },
        country: 'UK',
        visitedPages: [
          { path: '/', duration: 90000, isEntry: true, isExit: false },
          { path: '/products', duration: 120000, isEntry: false, isExit: false },
          { path: '/pricing', duration: 100000, isEntry: false, isExit: false },
          { path: '/about', duration: 80000, isEntry: false, isExit: false },
          { path: '/contact', duration: 60000, isEntry: false, isExit: true }
        ]
      },
      // Two days ago sessions (for returning visitor calculation)
      {
        siteId: testSiteId,
        userId: 'user1', // Same user as first session
        startTime: twoDaysAgo,
        duration: 200000,
        pagesViewed: 2,
        isBounce: false,
        isWeb3User: true,
        wallet: { walletAddress: '0x123...abc' },
        utmData: { source: 'direct' },
        device: { type: 'desktop' },
        browser: { name: 'chrome' },
        country: 'US',
        visitedPages: [
          { path: '/', duration: 120000, isEntry: true, isExit: false },
          { path: '/about', duration: 80000, isEntry: false, isExit: true }
        ]
      }
    ];

    await Session.insertMany(testSessions);

    // Create analytics data with user journeys
    const analyticsData = {
      siteId: testSiteId,
      userJourneys: [
        {
          userId: 'user1',
          totalSessions: 2,
          totalTimeSpent: 500000,
          totalPageViews: 5,
          firstVisit: twoDaysAgo,
          lastVisit: yesterday,
          hasConverted: true,
          daysToConversion: 1,
          userSegment: 'converter'
        },
        {
          userId: 'user2',
          totalSessions: 1,
          totalTimeSpent: 60000,
          totalPageViews: 1,
          firstVisit: yesterday,
          lastVisit: yesterday,
          hasConverted: false,
          daysToConversion: 0,
          userSegment: 'bounced'
        },
        {
          userId: 'user3',
          totalSessions: 1,
          totalTimeSpent: 450000,
          totalPageViews: 5,
          firstVisit: yesterday,
          lastVisit: yesterday,
          hasConverted: false,
          daysToConversion: 0,
          userSegment: 'engaged'
        }
      ]
    };

    await Analytics.create(analyticsData);
    console.log('🧪 Test data created');
  }

  describe('StatsAggregationService', () => {
    test('should aggregate daily statistics correctly', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const result = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        yesterday
      );

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();

      const stats = result.stats;
      expect(stats.siteId).toBe(testSiteId);
      expect(stats.timeframe).toBe('daily');
      expect(stats.metrics.visitors).toBe(3); // 3 sessions yesterday
      expect(stats.metrics.uniqueVisitors).toBe(3); // 3 unique users
      expect(stats.metrics.pageViews).toBe(9); // 3 + 1 + 5 pages
      expect(stats.metrics.walletsConnected).toBe(2); // user1 and user3
      expect(stats.metrics.web3Users).toBe(2); // user1 and user3
      expect(stats.metrics.returningVisitors).toBe(1); // user1 visited before
      expect(stats.metrics.newVisitors).toBe(2); // user2 and user3

      // Check traffic sources
      expect(stats.trafficSources).toHaveLength(3);
      const sources = stats.trafficSources.map(s => s.source);
      expect(sources).toContain('google');
      expect(sources).toContain('facebook');
      expect(sources).toContain('twitter');

      // Check top pages
      expect(stats.topPages.length).toBeGreaterThan(0);
      const homePage = stats.topPages.find(p => p.path === '/');
      expect(homePage).toBeDefined();
      expect(homePage.views).toBe(3); // All sessions visited home page

      // Check device breakdown
      expect(stats.deviceBreakdown.desktop).toBe(2);
      expect(stats.deviceBreakdown.mobile).toBe(1);

      // Check browser breakdown
      expect(stats.browserBreakdown.chrome).toBe(1);
      expect(stats.browserBreakdown.safari).toBe(1);
      expect(stats.browserBreakdown.firefox).toBe(1);

      // Check user journey metrics
      expect(stats.userJourneyMetrics.totalJourneys).toBe(3);
      expect(stats.userJourneyMetrics.conversionRate).toBeGreaterThan(0);

      console.log('✅ Daily aggregation test passed');
    }, 30000);

    test('should not create duplicate aggregations', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // First aggregation
      const result1 = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        yesterday
      );

      expect(result1.success).toBe(true);
      expect(result1.existing).toBeFalsy();

      // Second aggregation (should detect existing)
      const result2 = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        yesterday
      );

      expect(result2.success).toBe(true);
      expect(result2.existing).toBe(true);

      // Verify only one record exists
      const count = await AggregatedStats.countDocuments({
        siteId: testSiteId,
        timeframe: 'daily',
        timestamp: yesterday
      });

      expect(count).toBe(1);
      console.log('✅ Duplicate prevention test passed');
    });

    test('should handle hourly aggregation', async () => {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1, 0, 0, 0);

      const result = await statsAggregationService.aggregateStats(
        testSiteId,
        'hourly',
        oneHourAgo
      );

      expect(result.success).toBe(true);
      expect(result.stats.timeframe).toBe('hourly');
      console.log('✅ Hourly aggregation test passed');
    });

    test('should cache aggregated results', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // First call should create and cache
      const result1 = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        yesterday
      );

      expect(result1.success).toBe(true);

      // Check if result is cached
      const cacheKey = cacheService.generateCacheKey(
        'aggregated:stats',
        testSiteId,
        { timeframe: 'daily', timestamp: yesterday.getTime() }
      );

      const cachedResult = await cacheService.get(cacheKey);
      expect(cachedResult).toBeDefined();
      expect(cachedResult.siteId).toBe(testSiteId);

      console.log('✅ Caching test passed');
    });
  });

  describe('Background Processing Integration', () => {
    test('should queue and process stats aggregation job', async () => {
      const jobId = backgroundProcessor.queueJob({
        type: 'stats_aggregation',
        data: {
          siteId: testSiteId,
          timeframe: 'daily'
        },
        priority: 1
      });

      expect(jobId).toBeDefined();

      // Wait for job to be processed
      await new Promise(resolve => {
        const checkJob = () => {
          const job = backgroundProcessor.getJobStatus(jobId);
          if (job && (job.status === 'completed' || job.status === 'failed')) {
            resolve();
          } else {
            setTimeout(checkJob, 100);
          }
        };
        checkJob();
      });

      const finalJob = backgroundProcessor.getJobStatus(jobId);
      expect(finalJob.status).toBe('completed');
      expect(finalJob.result.success).toBe(true);

      console.log('✅ Background processing test passed');
    }, 30000);

    test('should schedule aggregation for active sites', async () => {
      const results = await backgroundProcessor.scheduleStatsAggregation('daily');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      const siteResult = results.find(r => r.timeframe === 'daily');
      expect(siteResult).toBeDefined();

      console.log('✅ Scheduling test passed');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large dataset aggregation efficiently', async () => {
      // Create larger test dataset
      const largeSessions = [];
      const baseTime = new Date();
      baseTime.setDate(baseTime.getDate() - 1);

      for (let i = 0; i < 1000; i++) {
        largeSessions.push({
          siteId: testSiteId,
          userId: `user${i}`,
          startTime: new Date(baseTime.getTime() + i * 1000),
          duration: Math.random() * 600000, // 0-10 minutes
          pagesViewed: Math.floor(Math.random() * 10) + 1,
          isBounce: Math.random() < 0.3,
          isWeb3User: Math.random() < 0.4,
          wallet: { 
            walletAddress: Math.random() < 0.4 ? `0x${i}...abc` : 'No Wallet Detected' 
          },
          utmData: { 
            source: ['google', 'facebook', 'twitter', 'direct'][Math.floor(Math.random() * 4)] 
          },
          device: { 
            type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)] 
          },
          browser: { 
            name: ['chrome', 'firefox', 'safari', 'edge'][Math.floor(Math.random() * 4)] 
          },
          country: ['US', 'CA', 'UK', 'DE', 'FR'][Math.floor(Math.random() * 5)],
          visitedPages: [
            { path: '/', duration: 60000, isEntry: true, isExit: false },
            { path: '/about', duration: 40000, isEntry: false, isExit: true }
          ]
        });
      }

      await Session.insertMany(largeSessions);

      const startTime = Date.now();
      const result = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        baseTime
      );
      const processingTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.stats.metrics.visitors).toBe(1000);
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`✅ Performance test passed - processed 1000 sessions in ${processingTime}ms`);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle missing site data gracefully', async () => {
      const result = await statsAggregationService.aggregateStats(
        'non-existent-site',
        'daily',
        new Date()
      );

      expect(result.success).toBe(true);
      expect(result.stats.metrics.visitors).toBe(0);
      console.log('✅ Missing data handling test passed');
    });

    test('should handle invalid timeframe', async () => {
      try {
        await statsAggregationService.aggregateStats(
          testSiteId,
          'invalid-timeframe',
          new Date()
        );
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toContain('Invalid timeframe');
      }
      console.log('✅ Invalid timeframe handling test passed');
    });
  });

  describe('Data Consistency', () => {
    test('should maintain data consistency across aggregations', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // Aggregate daily stats
      const dailyResult = await statsAggregationService.aggregateStats(
        testSiteId,
        'daily',
        yesterday
      );

      // Aggregate hourly stats for the same day
      const hourlyResults = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourTimestamp = new Date(yesterday);
        hourTimestamp.setHours(hour);
        
        const hourlyResult = await statsAggregationService.aggregateStats(
          testSiteId,
          'hourly',
          hourTimestamp
        );
        
        if (hourlyResult.success && hourlyResult.stats.metrics.visitors > 0) {
          hourlyResults.push(hourlyResult.stats);
        }
      }

      // Sum hourly visitors should equal daily visitors
      const totalHourlyVisitors = hourlyResults.reduce(
        (sum, stats) => sum + stats.metrics.visitors, 
        0
      );

      expect(totalHourlyVisitors).toBe(dailyResult.stats.metrics.visitors);
      console.log('✅ Data consistency test passed');
    }, 60000);
  });
});

/**
 * Integration test with actual API endpoints
 */
describe('Stats Aggregation API Integration', () => {
  let app;
  let mongoServer;

  beforeAll(async () => {
    // Setup test server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Import app after database connection
    app = require('../index');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test('should trigger stats aggregation via API', async () => {
    const response = await request(app)
      .post('/api/stats-aggregation/trigger')
      .send({
        siteId: 'test-site-api',
        timeframes: ['daily']
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.jobIds).toBeDefined();
    expect(Array.isArray(response.body.jobIds)).toBe(true);
    console.log('✅ API trigger test passed');
  });

  test('should get processing statistics via API', async () => {
    const response = await request(app)
      .get('/api/stats-aggregation/processing-stats');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.processing).toBeDefined();
    expect(response.body.queue).toBeDefined();
    console.log('✅ API stats test passed');
  });

  test('should handle invalid requests gracefully', async () => {
    const response = await request(app)
      .post('/api/stats-aggregation/trigger')
      .send({
        // Missing siteId
        timeframes: ['daily']
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Site ID is required');
    console.log('✅ API error handling test passed');
  });
});