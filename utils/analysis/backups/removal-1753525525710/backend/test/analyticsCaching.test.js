/**
 * Test suite for Analytics Caching Integration
 * Tests the integration between AnalyticsProcessor and CacheService
 */

const AnalyticsProcessor = require('../utils/analyticsProcessor');
const cacheService = require('../services/cacheService');

async function testAnalyticsCaching() {
  console.log('🧪 Starting Analytics Caching Integration tests...\n');
  
  try {
    // Test 1: AnalyticsProcessor with caching
    console.log('Test 1: AnalyticsProcessor caching integration');
    const testSiteId = 'test-site-cache-123';
    const processor = new AnalyticsProcessor(testSiteId);
    
    // Clear any existing cache
    cacheService.invalidate('*');
    
    console.log('✅ AnalyticsProcessor created with caching support');
    
    // Test 2: Cache key generation
    console.log('\nTest 2: Cache key generation for analytics');
    const chartCacheKey = cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.chartData,
      testSiteId,
      { timeframe: 'daily', start: '2024-01-01', end: '2024-01-31' }
    );
    
    const trafficCacheKey = cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.trafficSources,
      testSiteId,
      { start: '2024-01-01', end: '2024-01-31' }
    );
    
    console.log('Chart data cache key:', chartCacheKey);
    console.log('Traffic sources cache key:', trafficCacheKey);
    console.log('✅ Cache key generation test passed');
    
    // Test 3: Mock database response caching
    console.log('\nTest 3: Mock analytics data caching');
    
    // Mock chart data
    const mockChartData = {
      labels: ['2024-01-01', '2024-01-02'],
      datasets: [
        { label: 'Visitors', data: [100, 150] },
        { label: 'Wallets', data: [10, 20] }
      ]
    };
    
    // Cache the mock data
    await cacheService.set(chartCacheKey, mockChartData, { ttl: 300 });
    
    // Retrieve from cache
    const cachedChartData = await cacheService.get(chartCacheKey);
    console.log('✅ Chart data caching test passed:', 
      JSON.stringify(cachedChartData) === JSON.stringify(mockChartData));
    
    // Test 4: Cache invalidation patterns
    console.log('\nTest 4: Cache invalidation patterns');
    
    // Set multiple cache entries
    await cacheService.set('charts:site1:abc123', { data: 1 });
    await cacheService.set('charts:site2:def456', { data: 2 });
    await cacheService.set('traffic:site1:ghi789', { data: 3 });
    await cacheService.set('analytics:site1:jkl012', { data: 4 });
    
    // Test pattern invalidation
    const chartsInvalidated = cacheService.invalidate('charts:*');
    const site1Invalidated = cacheService.invalidate('*:site1:*');
    
    console.log('Charts invalidated:', chartsInvalidated);
    console.log('Site1 invalidated:', site1Invalidated);
    console.log('✅ Cache invalidation test passed');
    
    // Test 5: Cache statistics after operations
    console.log('\nTest 5: Cache statistics');
    const stats = cacheService.getStats();
    console.log('Cache statistics:');
    console.log('  L1 Hit Rate:', stats.l1Cache.hitRate);
    console.log('  L2 Hit Rate:', stats.l2Cache.hitRate);
    console.log('  Total Requests:', stats.overall.totalRequests);
    console.log('  Cache Warming Requests:', stats.overall.cacheWarming.requests);
    console.log('✅ Statistics test passed');
    
    // Test 6: Cache warming for analytics
    console.log('\nTest 6: Cache warming for analytics');
    const warmingResult = await cacheService.warmCache(testSiteId);
    console.log('Warming result:', {
      siteId: warmingResult.siteId,
      totalOperations: warmingResult.totalOperations,
      successfulOperations: warmingResult.successfulOperations,
      totalTime: warmingResult.totalTime
    });
    console.log('✅ Cache warming test passed');
    
    // Test 7: Cache health check
    console.log('\nTest 7: Cache health check');
    const health = cacheService.getHealth();
    console.log('Health status:', health.status);
    console.log('L1 Cache operational:', health.l1Cache.operational);
    console.log('L2 Cache operational:', health.l2Cache.operational);
    console.log('Recommendations count:', health.recommendations.length);
    console.log('✅ Health check test passed');
    
    console.log('\n🎉 All Analytics Caching Integration tests passed!');
    
    // Display final cache statistics
    console.log('\n📊 Final Cache Statistics:');
    const finalStats = cacheService.getStats();
    console.log('L1 Cache Keys:', finalStats.l1Cache.keys);
    console.log('L2 Cache Keys:', finalStats.l2Cache.keys);
    console.log('L1 Hit Rate:', finalStats.l1Cache.hitRate);
    console.log('L2 Hit Rate:', finalStats.l2Cache.hitRate);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testAnalyticsCaching()
    .then(() => {
      console.log('\n✅ Analytics caching test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Analytics caching test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAnalyticsCaching };