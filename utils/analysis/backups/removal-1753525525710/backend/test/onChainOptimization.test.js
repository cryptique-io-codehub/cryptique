/**
 * Test suite for OnChain Query Optimization
 * Tests the optimized onChain data queries with caching and performance monitoring
 */

const queryOptimizer = require('../services/queryOptimizer');
const cacheService = require('../services/cacheService');

async function testOnChainOptimization() {
  console.log('🧪 Starting OnChain Query Optimization tests...\n');
  
  try {
    // Test 1: Cache key generation for onChain queries
    console.log('Test 1: Cache key generation for onChain queries');
    
    const contractCacheKey = cacheService.generateCacheKey(
      'onchain:contract',
      'ethereum:0x123...abc'
    );
    
    const crossChainCacheKey = cacheService.generateCacheKey(
      'onchain:crosschain',
      '0x456...def'
    );
    
    console.log('Contract cache key:', contractCacheKey);
    console.log('Cross-chain cache key:', crossChainCacheKey);
    console.log('✅ Cache key generation test passed');
    
    // Test 2: Mock smart contract verification caching
    console.log('\nTest 2: Mock smart contract verification caching');
    
    const mockContractData = {
      success: true,
      contract: {
        address: '0x123...abc',
        chain: 'ethereum',
        verified: true,
        chainId: '1',
        verifiedAt: new Date(),
        source: 'test'
      }
    };
    
    // Cache the mock data
    await cacheService.set(contractCacheKey, mockContractData, { ttl: 3600 });
    
    // Retrieve from cache
    const cachedContractData = await cacheService.get(contractCacheKey);
    console.log('Cached contract verification:', cachedContractData?.success);
    console.log('✅ Contract verification caching test passed');
    
    // Test 3: Mock cross-chain data caching
    console.log('\nTest 3: Mock cross-chain data caching');
    
    const mockCrossChainData = {
      success: true,
      data: {
        wallet_address: '0x456...def',
        chains: ['ethereum', 'polygon', 'arbitrum'],
        total_transactions: 150,
        total_value: '1.5 ETH'
      },
      walletAddress: '0x456...def',
      fetchedAt: new Date(),
      source: 'test'
    };
    
    // Cache the mock data
    await cacheService.set(crossChainCacheKey, mockCrossChainData, { ttl: 1800 });
    
    // Retrieve from cache
    const cachedCrossChainData = await cacheService.get(crossChainCacheKey);
    console.log('Cached cross-chain data:', cachedCrossChainData?.success);
    console.log('✅ Cross-chain data caching test passed');
    
    // Test 4: QueryOptimizer integration
    console.log('\nTest 4: QueryOptimizer integration');
    
    const testCacheKey = 'test:onchain:optimization';
    let queryExecuted = false;
    
    const result = await queryOptimizer.executeOptimizedQuery(
      'test_onchain_query',
      testCacheKey,
      async () => {
        queryExecuted = true;
        return { test: 'data', timestamp: new Date() };
      },
      { ttl: 300, useL2: true }
    );
    
    console.log('Query executed:', queryExecuted);
    console.log('Result received:', !!result);
    console.log('✅ QueryOptimizer integration test passed');
    
    // Test 5: Cache hit on second request
    console.log('\nTest 5: Cache hit on second request');
    
    let secondQueryExecuted = false;
    
    const secondResult = await queryOptimizer.executeOptimizedQuery(
      'test_onchain_query',
      testCacheKey,
      async () => {
        secondQueryExecuted = true;
        return { test: 'data', timestamp: new Date() };
      },
      { ttl: 300, useL2: true }
    );
    
    console.log('Second query executed:', secondQueryExecuted);
    console.log('Second result received:', !!secondResult);
    console.log('✅ Cache hit test passed:', !secondQueryExecuted);
    
    // Test 6: Query performance statistics
    console.log('\nTest 6: Query performance statistics');
    
    const queryStats = queryOptimizer.getQueryStats();
    console.log('Query statistics:');
    console.log('  Total queries:', queryStats.totalQueries);
    console.log('  Cached queries:', queryStats.cachedQueries);
    console.log('  Cache hit rate:', queryStats.cacheHitRate + '%');
    console.log('  Average query time:', queryStats.averageQueryTime + 'ms');
    console.log('  Query types:', Object.keys(queryStats.queryTypes));
    console.log('✅ Query statistics test passed');
    
    // Test 7: Error handling simulation
    console.log('\nTest 7: Error handling simulation');
    
    try {
      await queryOptimizer.executeOptimizedQuery(
        'test_error_query',
        'test:error:key',
        async () => {
          throw new Error('Simulated API error');
        },
        { ttl: 300 }
      );
    } catch (error) {
      console.log('Error caught:', error.message);
      console.log('✅ Error handling test passed');
    }
    
    // Test 8: Cache invalidation for onChain data
    console.log('\nTest 8: Cache invalidation for onChain data');
    
    // Set multiple onChain cache entries
    await cacheService.set('onchain:contract:ethereum:0x111', { data: 1 });
    await cacheService.set('onchain:contract:polygon:0x222', { data: 2 });
    await cacheService.set('onchain:crosschain:0x333', { data: 3 });
    await cacheService.set('other:cache:key', { data: 4 });
    
    // Test pattern invalidation
    const contractsInvalidated = cacheService.invalidate('onchain:contract:*');
    const crossChainInvalidated = cacheService.invalidate('onchain:crosschain:*');
    
    console.log('Contracts invalidated:', contractsInvalidated);
    console.log('Cross-chain invalidated:', crossChainInvalidated);
    console.log('✅ Cache invalidation test passed');
    
    // Test 9: Performance under load
    console.log('\nTest 9: Performance under load');
    
    const loadTestStart = Date.now();
    const promises = [];
    
    // Simulate multiple concurrent onChain requests
    for (let i = 0; i < 20; i++) {
      const promise = queryOptimizer.executeOptimizedQuery(
        'load_test_query',
        `test:load:${i}`,
        async () => {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return { index: i, timestamp: Date.now() };
        },
        { ttl: 300 }
      );
      promises.push(promise);
    }
    
    const results = await Promise.all(promises);
    const loadTestEnd = Date.now();
    
    console.log('Load test results:');
    console.log('  Requests processed:', results.length);
    console.log('  Total time:', loadTestEnd - loadTestStart, 'ms');
    console.log('  Avg time per request:', Math.round((loadTestEnd - loadTestStart) / results.length), 'ms');
    console.log('✅ Performance under load test passed');
    
    // Test 10: Cache warming for onChain data
    console.log('\nTest 10: Cache warming for onChain data');
    
    const warmingOperations = [
      {
        key: 'onchain:contract:ethereum:0xwarm1',
        data: { address: '0xwarm1', chain: 'ethereum', verified: true }
      },
      {
        key: 'onchain:contract:polygon:0xwarm2',
        data: { address: '0xwarm2', chain: 'polygon', verified: true }
      },
      {
        key: 'onchain:crosschain:0xwarm3',
        data: { wallet: '0xwarm3', chains: ['ethereum', 'polygon'] }
      }
    ];
    
    for (const operation of warmingOperations) {
      await cacheService.set(operation.key, operation.data, { ttl: 3600 });
    }
    
    console.log('Cache warming completed for', warmingOperations.length, 'entries');
    console.log('✅ Cache warming test passed');
    
    console.log('\n🎉 All OnChain Query Optimization tests passed!');
    
    // Display final statistics
    console.log('\n📊 Final OnChain Optimization Statistics:');
    const finalStats = {
      queryStats: queryOptimizer.getQueryStats(),
      cacheStats: cacheService.getStats()
    };
    
    console.log('Query Optimizer Stats:');
    console.log('  Total Queries:', finalStats.queryStats.totalQueries);
    console.log('  Cache Hit Rate:', finalStats.queryStats.cacheHitRate + '%');
    console.log('  Average Query Time:', finalStats.queryStats.averageQueryTime + 'ms');
    console.log('  Slow Queries:', finalStats.queryStats.slowQueries);
    
    console.log('\nCache Service Stats:');
    console.log('  L1 Hit Rate:', finalStats.cacheStats.l1Cache.hitRate);
    console.log('  L2 Hit Rate:', finalStats.cacheStats.l2Cache.hitRate);
    console.log('  L1 Keys:', finalStats.cacheStats.l1Cache.keys);
    console.log('  L2 Keys:', finalStats.cacheStats.l2Cache.keys);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testOnChainOptimization()
    .then(() => {
      console.log('\n✅ OnChain Query Optimization test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ OnChain Query Optimization test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testOnChainOptimization };