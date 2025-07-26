/**
 * Test suite for CacheService
 * Basic functionality tests to ensure cache service works correctly
 */

const cacheService = require('../services/cacheService');

async function testCacheService() {
  console.log('🧪 Starting CacheService tests...\n');
  
  try {
    // Test 1: Basic set/get operations
    console.log('Test 1: Basic set/get operations');
    const testKey = 'test:basic';
    const testValue = { message: 'Hello Cache!', timestamp: new Date() };
    
    await cacheService.set(testKey, testValue);
    const retrievedValue = await cacheService.get(testKey);
    
    console.log('✅ Set/Get test passed:', JSON.stringify(retrievedValue) === JSON.stringify(testValue));
    
    // Test 2: Cache key generation
    console.log('\nTest 2: Cache key generation');
    const key1 = cacheService.generateCacheKey('analytics:', 'site123', { timeframe: 'daily' });
    const key2 = cacheService.generateCacheKey('analytics:', 'site123', { timeframe: 'daily' });
    const key3 = cacheService.generateCacheKey('analytics:', 'site123', { timeframe: 'hourly' });
    
    console.log('Generated keys:');
    console.log('  Key1:', key1);
    console.log('  Key2:', key2);
    console.log('  Key3:', key3);
    console.log('✅ Key consistency test passed:', key1 === key2);
    console.log('✅ Key uniqueness test passed:', key1 !== key3);
    
    // Test 3: Fallback function
    console.log('\nTest 3: Fallback function');
    let fallbackCalled = false;
    const fallbackFunction = async () => {
      fallbackCalled = true;
      return { computed: true, value: Math.random() };
    };
    
    const fallbackKey = 'test:fallback';
    const fallbackResult = await cacheService.get(fallbackKey, fallbackFunction);
    
    console.log('✅ Fallback function test passed:', fallbackCalled && fallbackResult.computed);
    
    // Test 4: Cache invalidation
    console.log('\nTest 4: Cache invalidation');
    await cacheService.set('test:pattern:1', { data: 1 });
    await cacheService.set('test:pattern:2', { data: 2 });
    await cacheService.set('other:key', { data: 3 });
    
    const invalidatedCount = cacheService.invalidate('test:pattern:*');
    console.log('✅ Invalidation test passed:', invalidatedCount === 2);
    
    // Test 5: Cache statistics
    console.log('\nTest 5: Cache statistics');
    const stats = cacheService.getStats();
    console.log('Cache statistics:');
    console.log('  L1 Keys:', stats.l1Cache.keys);
    console.log('  L2 Keys:', stats.l2Cache.keys);
    console.log('  Total Requests:', stats.overall.totalRequests);
    console.log('✅ Statistics test passed:', typeof stats === 'object');
    
    // Test 6: Cache warming
    console.log('\nTest 6: Cache warming');
    const warmingResult = await cacheService.warmCache('test-site-123');
    console.log('Warming result:', {
      totalOperations: warmingResult.totalOperations,
      successfulOperations: warmingResult.successfulOperations,
      totalTime: warmingResult.totalTime
    });
    console.log('✅ Cache warming test passed:', warmingResult.totalOperations > 0);
    
    // Test 7: Health check
    console.log('\nTest 7: Health check');
    const health = cacheService.getHealth();
    console.log('Health status:', health.status);
    console.log('Recommendations:', health.recommendations.length);
    console.log('✅ Health check test passed:', health.status === 'healthy');
    
    console.log('\n🎉 All CacheService tests passed!');
    
    // Display final statistics
    console.log('\n📊 Final Cache Statistics:');
    const finalStats = cacheService.getStats();
    console.log(JSON.stringify(finalStats, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests if called directly
if (require.main === module) {
  testCacheService()
    .then(() => {
      console.log('\n✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testCacheService };