/**
 * Cache Management Routes
 * Provides endpoints for cache monitoring, statistics, and administration
 */

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const { getCacheStatsByCategory, warmSiteCache } = require('../config/cacheConfig');

// Get cache statistics
router.get('/stats', (req, res) => {
  try {
    const stats = getCacheStatsByCategory();
    res.json({
      success: true,
      timestamp: new Date(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

// Get cache health status
router.get('/health', (req, res) => {
  try {
    const health = cacheService.getHealth();
    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    console.error('Error getting cache health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache health status'
    });
  }
});

// Warm cache for a specific site
router.post('/warm/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID is required'
      });
    }
    
    const result = await warmSiteCache(siteId);
    
    res.json({
      success: true,
      message: `Cache warming completed for site ${siteId}`,
      ...result
    });
  } catch (error) {
    console.error('Error warming cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to warm cache'
    });
  }
});

// Invalidate cache by pattern
router.delete('/invalidate', (req, res) => {
  try {
    const { pattern } = req.query;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required'
      });
    }
    
    const invalidatedCount = cacheService.invalidate(pattern);
    
    res.json({
      success: true,
      message: `Invalidated ${invalidatedCount} cache entries`,
      pattern,
      invalidatedCount
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

// Clear all cache
router.delete('/clear', (req, res) => {
  try {
    cacheService.clearAll();
    
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

// Get cache keys by prefix
router.get('/keys/:prefix?', (req, res) => {
  try {
    const { prefix } = req.params;
    const stats = cacheService.getStats();
    
    // This is a simplified version - in a real implementation,
    // you'd want to expose cache keys through the cache service
    res.json({
      success: true,
      prefix: prefix || 'all',
      l1Keys: stats.l1Cache.keys,
      l2Keys: stats.l2Cache.keys,
      message: 'Use /stats endpoint for detailed cache information'
    });
  } catch (error) {
    console.error('Error getting cache keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache keys'
    });
  }
});

// Cache performance test endpoint
router.post('/test', async (req, res) => {
  try {
    const { operations = 100 } = req.body;
    const testResults = {
      operations,
      startTime: Date.now(),
      results: []
    };
    
    // Perform cache operations for testing
    for (let i = 0; i < operations; i++) {
      const key = `test:performance:${i}`;
      const value = { testData: i, timestamp: Date.now() };
      
      const setStart = Date.now();
      await cacheService.set(key, value);
      const setTime = Date.now() - setStart;
      
      const getStart = Date.now();
      const retrieved = await cacheService.get(key);
      const getTime = Date.now() - getStart;
      
      testResults.results.push({
        operation: i,
        setTime,
        getTime,
        success: retrieved !== null
      });
    }
    
    testResults.endTime = Date.now();
    testResults.totalTime = testResults.endTime - testResults.startTime;
    testResults.avgSetTime = testResults.results.reduce((sum, r) => sum + r.setTime, 0) / operations;
    testResults.avgGetTime = testResults.results.reduce((sum, r) => sum + r.getTime, 0) / operations;
    testResults.successRate = (testResults.results.filter(r => r.success).length / operations) * 100;
    
    // Clean up test data
    for (let i = 0; i < operations; i++) {
      cacheService.invalidate(`test:performance:${i}`);
    }
    
    res.json({
      success: true,
      message: 'Cache performance test completed',
      ...testResults
    });
  } catch (error) {
    console.error('Error running cache test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run cache performance test'
    });
  }
});

module.exports = router;