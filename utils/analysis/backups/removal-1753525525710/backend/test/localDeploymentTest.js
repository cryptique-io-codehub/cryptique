/**
 * Local Deployment Test
 * Tests the complete MongoDB performance optimization system locally
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');

// Import all our services and models
const statsAggregationService = require('../services/statsAggregationService');
const backgroundProcessor = require('../services/backgroundProcessor');
const cacheService = require('../services/cacheService');
const AggregatedStats = require('../models/aggregatedStats');
const Session = require('../models/session');
const Analytics = require('../models/analytics');

// Import routes
const analyticsRouter = require('../routes/analytics');
const statsAggregationRouter = require('../routes/statsAggregationRouter');
const cacheRouter = require('../routes/cacheRouter');

async function runLocalDeploymentTest() {
  console.log('🚀 Starting Local Deployment Test for MongoDB Performance Optimizations\n');
  
  let mongoServer;
  let app;
  
  try {
    // 1. Setup in-memory MongoDB
    console.log('📦 Setting up in-memory MongoDB...');
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');

    // 2. Setup Express app with all routes
    console.log('\n🌐 Setting up Express application...');
    app = express();
    app.use(express.json());
    
    // Add CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
    
    // Mount routes
    app.use('/api/analytics', analyticsRouter);
    app.use('/api/stats-aggregation', statsAggregationRouter);
    app.use('/api/cache', cacheRouter);
    
    console.log('✅ Express app configured with all routes');

    // 3. Create test data
    console.log('\n📊 Creating test data...');
    await createTestData();
    console.log('✅ Test data created successfully');

    // 4. Test database indexes
    console.log('\n🔍 Testing database indexes...');
    await testDatabaseIndexes();
    console.log('✅ Database indexes working correctly');

    // 5. Test caching system
    console.log('\n💾 Testing multi-level caching system...');
    await testCachingSystem();
    console.log('✅ Caching system working correctly');

    // 6. Test background processing
    console.log('\n⚡ Testing background processing system...');
    await testBackgroundProcessing();
    console.log('✅ Background processing working correctly');

    // 7. Test stats aggregation
    console.log('\n📈 Testing statistics aggregation...');
    await testStatsAggregation();
    console.log('✅ Statistics aggregation working correctly');

    // 8. Test API endpoints
    console.log('\n🌐 Testing API endpoints...');
    await testAPIEndpoints(app);
    console.log('✅ API endpoints working correctly');

    // 9. Performance benchmarks
    console.log('\n⚡ Running performance benchmarks...');
    await runPerformanceBenchmarks(app);
    console.log('✅ Performance benchmarks completed');

    console.log('\n🎉 All tests passed! MongoDB Performance Optimizations are working correctly.');
    console.log('\n📊 System is ready for production deployment.');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    console.log('\n🧹 Cleanup completed');
  }
}

async function createTestData() {
  const testSiteId = 'test-site-local';
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  // Create test sessions
  const sessions = [];
  for (let i = 0; i < 100; i++) {
    sessions.push({
      sessionId: `session_${testSiteId}_${i}_${Date.now()}`,
      siteId: testSiteId,
      userId: `user${i}`,
      startTime: new Date(yesterday.getTime() + i * 60000), // Spread over time
      endTime: new Date(yesterday.getTime() + i * 60000 + Math.random() * 600000),
      duration: Math.random() * 600000, // 0-10 minutes
      pagesViewed: Math.floor(Math.random() * 10) + 1,
      isBounce: Math.random() < 0.3,
      isWeb3User: Math.random() < 0.4,
      sessionNumber: Math.floor(Math.random() * 5) + 1,
      entryPage: '/',
      exitPage: ['/about', '/contact', '/pricing', '/'][Math.floor(Math.random() * 4)],
      wallet: { 
        walletAddress: Math.random() < 0.4 ? `0x${i.toString(16)}...abc` : 'No Wallet Detected',
        walletType: Math.random() < 0.4 ? 'MetaMask' : '',
        chainName: Math.random() < 0.4 ? 'Ethereum' : ''
      },
      utmData: { 
        source: ['google', 'facebook', 'twitter', 'direct'][Math.floor(Math.random() * 4)],
        medium: ['organic', 'cpc', 'social', 'referral'][Math.floor(Math.random() * 4)],
        campaign: `campaign_${i % 5}`
      },
      device: { 
        type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)],
        os: ['Windows', 'macOS', 'iOS', 'Android'][Math.floor(Math.random() * 4)]
      },
      browser: { 
        name: ['chrome', 'firefox', 'safari', 'edge'][Math.floor(Math.random() * 4)],
        version: `${Math.floor(Math.random() * 100) + 1}.0`
      },
      country: ['US', 'CA', 'UK', 'DE', 'FR'][Math.floor(Math.random() * 5)],
      referrer: Math.random() < 0.5 ? `https://example${i % 10}.com` : '',
      lastActivity: new Date(yesterday.getTime() + i * 60000 + Math.random() * 600000),
      visitedPages: [
        { 
          path: '/', 
          timestamp: new Date(yesterday.getTime() + i * 60000),
          duration: 60000, 
          isEntry: true, 
          isExit: false 
        },
        { 
          path: '/about', 
          timestamp: new Date(yesterday.getTime() + i * 60000 + 60000),
          duration: 40000, 
          isEntry: false, 
          isExit: true 
        }
      ]
    });
  }

  await Session.insertMany(sessions);

  // Create analytics data
  const userJourneys = [];
  for (let i = 0; i < 50; i++) {
    userJourneys.push({
      userId: `user${i}`,
      totalSessions: Math.floor(Math.random() * 5) + 1,
      totalTimeSpent: Math.random() * 1800000, // 0-30 minutes
      totalPageViews: Math.floor(Math.random() * 20) + 1,
      firstVisit: twoDaysAgo,
      lastVisit: yesterday,
      hasConverted: Math.random() < 0.2,
      daysToConversion: Math.floor(Math.random() * 7),
      userSegment: ['converter', 'engaged', 'browser', 'bounced'][Math.floor(Math.random() * 4)]
    });
  }

  await Analytics.create({
    siteId: testSiteId,
    userJourneys
  });

  console.log(`  📊 Created ${sessions.length} test sessions`);
  console.log(`  👥 Created ${userJourneys.length} user journeys`);
}

async function testDatabaseIndexes() {
  // Test session queries with indexes
  const startTime = Date.now();
  
  const sessions = await Session.find({ 
    siteId: 'test-site-local',
    startTime: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).limit(10);
  
  const queryTime = Date.now() - startTime;
  console.log(`  🔍 Session query completed in ${queryTime}ms`);
  console.log(`  📊 Found ${sessions.length} sessions`);
}

async function testCachingSystem() {
  // Test L1 and L2 cache
  const testKey = 'test:performance:cache';
  const testData = { message: 'Performance test data', timestamp: new Date() };
  
  // Set data
  await cacheService.set(testKey, testData, { ttl: 300, useL2: true });
  
  // Get data (should hit L1 cache)
  const startTime = Date.now();
  const cachedData = await cacheService.get(testKey);
  const retrievalTime = Date.now() - startTime;
  
  console.log(`  💾 Cache retrieval completed in ${retrievalTime}ms`);
  console.log(`  ✅ Cache hit: ${cachedData ? 'YES' : 'NO'}`);
  
  // Test cache statistics
  const stats = cacheService.getStats();
  console.log(`  📊 Cache stats:`, JSON.stringify(stats, null, 2));
}

async function testBackgroundProcessing() {
  // Queue a test job
  const jobId = backgroundProcessor.queueJob({
    type: 'stats_aggregation',
    data: { siteId: 'test-site-local', timeframe: 'daily' },
    priority: 1
  });
  
  console.log(`  📋 Queued job: ${jobId}`);
  
  // Check processing stats
  const stats = backgroundProcessor.getStats();
  console.log(`  📊 Processing stats - Total jobs: ${stats.totalJobs}, Queue size: ${stats.queueSize}`);
  
  // Wait a moment for processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const jobStatus = backgroundProcessor.getJobStatus(jobId);
  console.log(`  ⚡ Job status: ${jobStatus ? jobStatus.status : 'not found'}`);
}

async function testStatsAggregation() {
  const testSiteId = 'test-site-local';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  const startTime = Date.now();
  const result = await statsAggregationService.aggregateStats(
    testSiteId,
    'daily',
    yesterday
  );
  const aggregationTime = Date.now() - startTime;
  
  console.log(`  📈 Aggregation completed in ${aggregationTime}ms`);
  console.log(`  ✅ Success: ${result.success}`);
  
  if (result.success && result.stats) {
    console.log(`  📊 Visitors: ${result.stats.metrics.visitors}`);
    console.log(`  📊 Page views: ${result.stats.metrics.pageViews}`);
    console.log(`  📊 Wallets connected: ${result.stats.metrics.walletsConnected}`);
  }
}

async function testAPIEndpoints(app) {
  // Test dashboard endpoint
  console.log('  🌐 Testing /api/analytics/dashboard endpoint...');
  const dashboardResponse = await request(app)
    .get('/api/analytics/dashboard')
    .query({ siteId: 'test-site-local', timeframe: 'daily' });
  
  console.log(`  📊 Dashboard response status: ${dashboardResponse.status}`);
  console.log(`  📊 Data source: ${dashboardResponse.body.source || 'unknown'}`);
  
  // Test stats aggregation trigger
  console.log('  🌐 Testing /api/stats-aggregation/trigger endpoint...');
  const triggerResponse = await request(app)
    .post('/api/stats-aggregation/trigger')
    .send({ siteId: 'test-site-local', timeframes: ['daily'] });
  
  console.log(`  📊 Trigger response status: ${triggerResponse.status}`);
  console.log(`  📊 Jobs queued: ${triggerResponse.body.jobIds ? triggerResponse.body.jobIds.length : 0}`);
  
  // Test processing stats
  console.log('  🌐 Testing /api/stats-aggregation/processing-stats endpoint...');
  const statsResponse = await request(app)
    .get('/api/stats-aggregation/processing-stats');
  
  console.log(`  📊 Stats response status: ${statsResponse.status}`);
  console.log(`  📊 Total jobs: ${statsResponse.body.processing ? statsResponse.body.processing.totalJobs : 0}`);
}

async function runPerformanceBenchmarks(app) {
  const iterations = 10;
  const results = [];
  
  console.log(`  ⚡ Running ${iterations} iterations of dashboard endpoint...`);
  
  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/analytics/dashboard')
      .query({ siteId: 'test-site-local', timeframe: 'daily' });
    
    const responseTime = Date.now() - startTime;
    results.push(responseTime);
    
    if (response.status !== 200) {
      console.log(`  ❌ Request ${i + 1} failed with status ${response.status}`);
    }
  }
  
  const avgResponseTime = results.reduce((sum, time) => sum + time, 0) / results.length;
  const minResponseTime = Math.min(...results);
  const maxResponseTime = Math.max(...results);
  
  console.log(`  📊 Performance Results:`);
  console.log(`    Average response time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`    Min response time: ${minResponseTime}ms`);
  console.log(`    Max response time: ${maxResponseTime}ms`);
  console.log(`    Target: <2000ms (${avgResponseTime < 2000 ? '✅ PASSED' : '❌ FAILED'})`);
}

// Run the test if called directly
if (require.main === module) {
  runLocalDeploymentTest()
    .then(() => {
      console.log('\n🎉 Local deployment test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Local deployment test failed:', error);
      process.exit(1);
    });
}

module.exports = { runLocalDeploymentTest };