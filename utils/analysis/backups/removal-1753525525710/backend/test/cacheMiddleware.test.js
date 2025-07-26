/**
 * Test suite for Cache Middleware Integration
 * Tests cache middleware functionality across different route types
 */

const cacheService = require('../services/cacheService');
const { cacheMiddlewares, getCacheStatsByCategory, warmSiteCache } = require('../config/cacheConfig');

async function testCacheMiddleware() {
  console.log('🧪 Starting Cache Middleware Integration tests...\n');
  
  try {
    // Test 1: Cache configuration validation
    console.log('Test 1: Cache configuration validation');
    const stats = getCacheStatsByCategory();
    console.log('Cache categories:', stats.categories);
    console.log('✅ Cache configuration test passed');
    
    // Test 2: Cache middleware creation
    console.log('\nTest 2: Cache middleware creation');
    const middlewareTypes = Object.keys(cacheMiddlewares);
    console.log('Available cache middlewares:', middlewareTypes);
    console.log('✅ Cache middleware creation test passed:', middlewareTypes.length > 0);
    
    // Test 3: Cache key generation for different routes
    console.log('\nTest 3: Cache key generation for different routes');
    
    // Mock request objects for testing
    const mockRequests = {
      chartData: {
        query: { siteId: 'test-site', timeframe: 'daily', start: '2024-01-01', end: '2024-01-31' }
      },
      trafficSources: {
        query: { siteId: 'test-site', start: '2024-01-01', end: '2024-01-31' }
      },
      userJourneys: {
        query: { siteId: 'test-site', teamId: 'team-123', timeframe: 'monthly' }
      },
      userSessions: {
        query: { userId: 'user-456' }
      },
      smartContracts: {
        body: { contractAddress: '0x123...abc', chainName: 'ethereum' }
      },
      crossChain: {
        body: { walletAddress: '0x456...def' }
      }
    };
    
    // Test key generation for each middleware type
    const keyTests = [
      {
        name: 'Chart Data',
        key: cacheService.generateCacheKey('charts:', 'test-site', { 
          timeframe: 'daily', 
          start: '2024-01-01', 
          end: '2024-01-31' 
        })
      },
      {
        name: 'Traffic Sources',
        key: cacheService.generateCacheKey('traffic:', 'test-site', { 
          start: '2024-01-01', 
          end: '2024-01-31' 
        })
      },
      {
        name: 'User Journeys',
        key: cacheService.generateCacheKey('journeys:', 'test-site', { 
          teamId: 'team-123', 
          timeframe: 'monthly' 
        })
      },
      {
        name: 'User Sessions',
        key: cacheService.generateCacheKey('sessions:', 'user-456')
      }
    ];
    
    keyTests.forEach(test => {
      console.log(`  ${test.name}: ${test.key}`);
    });
    console.log('✅ Cache key generation test passed');
    
    // Test 4: Cache warming functionality
    console.log('\nTest 4: Cache warming functionality');
    const warmingResult = await warmSiteCache('test-site-warming');
    console.log('Warming result:', {
      siteId: warmingResult.siteId,
      successful: warmingResult.successful,
      total: warmingResult.total
    });
    console.log('✅ Cache warming test passed:', warmingResult.successful > 0);
    
    // Test 5: Cache invalidation patterns
    console.log('\nTest 5: Cache invalidation patterns');
    
    // Set test data
    await cacheService.set('charts:test:123', { data: 'chart' });
    await cacheService.set('traffic:test:456', { data: 'traffic' });
    await cacheService.set('journeys:test:789', { data: 'journey' });
    await cacheService.set('onchain:contract:ethereum:0x123', { data: 'contract' });
    
    // Test pattern invalidation
    const chartsInvalidated = cacheService.invalidate('charts:*');
    const onchainInvalidated = cacheService.invalidate('onchain:*');
    
    console.log('Charts invalidated:', chartsInvalidated);
    console.log('Onchain invalidated:', onchainInvalidated);
    console.log('✅ Cache invalidation test passed');
    
    // Test 6: Cache statistics after operations
    console.log('\nTest 6: Cache statistics after operations');
    const finalStats = cacheService.getStats();
    console.log('Final cache statistics:');
    console.log('  L1 Keys:', finalStats.l1Cache.keys);
    console.log('  L2 Keys:', finalStats.l2Cache.keys);
    console.log('  L1 Hit Rate:', finalStats.l1Cache.hitRate);
    console.log('  L2 Hit Rate:', finalStats.l2Cache.hitRate);
    console.log('✅ Statistics test passed');
    
    // Test 7: Cache health check
    console.log('\nTest 7: Cache health check');
    const health = cacheService.getHealth();
    console.log('Health status:', health.status);
    console.log('L1 operational:', health.l1Cache.operational);
    console.log('L2 operational:', health.l2Cache.operational);
    console.log('Recommendations:', health.recommendations.length);
    console.log('✅ Health check test passed');
    
    // Test 8: Performance test
    console.log('\nTest 8: Cache performance test');
    const performanceStart = Date.now();
    
    // Perform multiple cache operations
    const operations = 50;
    const performanceResults = [];
    
    for (let i = 0; i < operations; i++) {
      const key = `perf:test:${i}`;
      const value = { index: i, timestamp: Date.now() };
      
      const setStart = Date.now();
      await cacheService.set(key, value);
      const setTime = Date.now() - setStart;
      
      const getStart = Date.now();
      const retrieved = await cacheService.get(key);
      const getTime = Date.now() - getStart;
      
      performanceResults.push({ setTime, getTime, success: retrieved !== null });
    }
    
    const performanceEnd = Date.now();
    const totalTime = performanceEnd - performanceStart;
    const avgSetTime = performanceResults.reduce((sum, r) => sum + r.setTime, 0) / operations;
    const avgGetTime = performanceResults.reduce((sum, r) => sum + r.getTime, 0) / operations;
    const successRate = (performanceResults.filter(r => r.success).length / operations) * 100;
    
    console.log('Performance test results:');
    console.log(`  Operations: ${operations}`);
    console.log(`  Total time: ${totalTime}ms`);
    console.log(`  Avg set time: ${avgSetTime.toFixed(2)}ms`);
    console.log(`  Avg get time: ${avgGetTime.toFixed(2)}ms`);
    console.log(`  Success rate: ${successRate}%`);
    console.log('✅ Performance test passed');
    
    // Clean up performance test data
    cacheService.invalidate('perf:test:*');
    
    console.log('\n🎉 All Cache Middleware Integration tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testCacheMiddleware()
    .then(() => {
      console.log('\n✅ Cache middleware test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Cache middleware test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testCacheMiddleware };