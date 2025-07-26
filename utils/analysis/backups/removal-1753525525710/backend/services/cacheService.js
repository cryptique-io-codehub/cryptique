/**
 * Multi-Level Cache Service for MongoDB Performance Optimization
 * Implements intelligent caching with statistics tracking and cache warming
 */

const NodeCache = require('node-cache');
const crypto = require('crypto');

class CacheService {
  constructor(options = {}) {
    // Default cache configuration
    this.config = {
      // L1 Cache (Memory) - Fast access for frequently used data
      l1: {
        stdTTL: options.l1TTL || 300, // 5 minutes default
        checkperiod: options.l1CheckPeriod || 60, // Check for expired keys every 60 seconds
        maxKeys: options.l1MaxKeys || 1000, // Maximum number of keys in L1 cache
        useClones: false // Don't clone objects for better performance
      },
      
      // L2 Cache (Computed Results) - Longer TTL for expensive computations
      l2: {
        stdTTL: options.l2TTL || 3600, // 1 hour default
        checkperiod: options.l2CheckPeriod || 300, // Check every 5 minutes
        maxKeys: options.l2MaxKeys || 500, // Fewer keys but longer retention
        useClones: false
      },
      
      // Cache key prefixes for organization
      keyPrefixes: {
        analytics: 'analytics:',
        sessions: 'sessions:',
        userJourneys: 'journeys:',
        chartData: 'charts:',
        trafficSources: 'traffic:',
        stats: 'stats:',
        onchain: 'onchain:'
      }
    };
    
    // Initialize cache instances
    this.l1Cache = new NodeCache(this.config.l1);
    this.l2Cache = new NodeCache(this.config.l2);
    
    // Statistics tracking
    this.stats = {
      l1: { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 },
      l2: { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 },
      totalRequests: 0,
      cacheWarming: { requests: 0, successes: 0, failures: 0 }
    };
    
    // Set up event listeners for statistics
    this.setupEventListeners();
    
    console.log('🚀 CacheService initialized with multi-level caching');
  }
  
  /**
   * Set up event listeners for cache statistics
   */
  setupEventListeners() {
    // L1 Cache events
    this.l1Cache.on('hit', (key, value) => {
      this.stats.l1.hits++;
      this.stats.totalRequests++;
    });
    
    this.l1Cache.on('miss', (key) => {
      this.stats.l1.misses++;
      this.stats.totalRequests++;
    });
    
    this.l1Cache.on('set', (key, value) => {
      this.stats.l1.sets++;
    });
    
    this.l1Cache.on('del', (key, value) => {
      this.stats.l1.deletes++;
    });
    
    this.l1Cache.on('expired', (key, value) => {
      this.stats.l1.evictions++;
    });
    
    // L2 Cache events
    this.l2Cache.on('hit', (key, value) => {
      this.stats.l2.hits++;
    });
    
    this.l2Cache.on('miss', (key) => {
      this.stats.l2.misses++;
    });
    
    this.l2Cache.on('set', (key, value) => {
      this.stats.l2.sets++;
    });
    
    this.l2Cache.on('del', (key, value) => {
      this.stats.l2.deletes++;
    });
    
    this.l2Cache.on('expired', (key, value) => {
      this.stats.l2.evictions++;
    });
  }
  
  /**
   * Generate consistent cache key with optional parameters
   * @param {string} prefix - Cache key prefix
   * @param {string} identifier - Main identifier (e.g., siteId)
   * @param {Object} params - Additional parameters to include in key
   * @returns {string} Generated cache key
   */
  generateCacheKey(prefix, identifier, params = {}) {
    const baseKey = `${prefix}${identifier}`;
    
    if (Object.keys(params).length === 0) {
      return baseKey;
    }
    
    // Sort parameters for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    // Create hash of parameters for compact key
    const paramString = JSON.stringify(sortedParams);
    const paramHash = crypto.createHash('md5').update(paramString).digest('hex').substring(0, 8);
    
    return `${baseKey}:${paramHash}`;
  }
  
  /**
   * Get data from cache with fallback function
   * Implements multi-level cache lookup: L1 -> L2 -> fallback function
   * @param {string} key - Cache key
   * @param {Function} fallbackFunction - Function to call if cache miss
   * @param {Object} options - Cache options
   * @returns {Promise<any>} Cached or computed data
   */
  async get(key, fallbackFunction = null, options = {}) {
    const { 
      ttl = null, 
      useL2 = true, 
      warmCache = false,
      skipL1 = false 
    } = options;
    
    try {
      // Try L1 cache first (unless skipped)
      if (!skipL1) {
        const l1Value = this.l1Cache.get(key);
        if (l1Value !== undefined) {
          console.log(`🎯 L1 Cache HIT: ${key}`);
          return l1Value;
        }
      }
      
      // Try L2 cache if enabled
      if (useL2) {
        const l2Value = this.l2Cache.get(key);
        if (l2Value !== undefined) {
          console.log(`🎯 L2 Cache HIT: ${key}`);
          
          // Promote to L1 cache for faster future access
          if (!skipL1) {
            this.l1Cache.set(key, l2Value, ttl || this.config.l1.stdTTL);
          }
          
          return l2Value;
        }
      }
      
      console.log(`❌ Cache MISS: ${key}`);
      
      // If no fallback function, return null
      if (!fallbackFunction) {
        return null;
      }
      
      // Execute fallback function
      console.log(`🔄 Executing fallback for: ${key}`);
      const startTime = Date.now();
      const result = await fallbackFunction();
      const executionTime = Date.now() - startTime;
      
      console.log(`⚡ Fallback executed in ${executionTime}ms for: ${key}`);
      
      // Cache the result if it's not null/undefined
      if (result !== null && result !== undefined) {
        await this.set(key, result, { ttl, useL2, warmCache });
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Cache get error for key ${key}:`, error);
      
      // If fallback function exists, try to execute it
      if (fallbackFunction) {
        try {
          return await fallbackFunction();
        } catch (fallbackError) {
          console.error(`❌ Fallback function error for key ${key}:`, fallbackError);
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Set data in cache with multi-level support
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {Object} options - Cache options
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, options = {}) {
    const { 
      ttl = null, 
      useL2 = true, 
      onlyL1 = false, 
      onlyL2 = false 
    } = options;
    
    try {
      let success = true;
      
      // Set in L1 cache (unless onlyL2 is specified)
      if (!onlyL2) {
        const l1TTL = ttl || this.config.l1.stdTTL;
        const l1Success = this.l1Cache.set(key, value, l1TTL);
        if (l1Success) {
          console.log(`💾 L1 Cache SET: ${key} (TTL: ${l1TTL}s)`);
        } else {
          console.warn(`⚠️  L1 Cache SET failed: ${key}`);
          success = false;
        }
      }
      
      // Set in L2 cache (unless onlyL1 is specified)
      if (useL2 && !onlyL1) {
        const l2TTL = ttl || this.config.l2.stdTTL;
        const l2Success = this.l2Cache.set(key, value, l2TTL);
        if (l2Success) {
          console.log(`💾 L2 Cache SET: ${key} (TTL: ${l2TTL}s)`);
        } else {
          console.warn(`⚠️  L2 Cache SET failed: ${key}`);
          success = false;
        }
      }
      
      return success;
      
    } catch (error) {
      console.error(`❌ Cache set error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Invalidate cache entries by pattern
   * @param {string} pattern - Pattern to match keys (supports wildcards)
   * @returns {number} Number of keys invalidated
   */
  invalidate(pattern) {
    try {
      let invalidatedCount = 0;
      
      // Convert pattern to regex
      const regexPattern = pattern.replace(/\*/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      
      // Invalidate L1 cache
      const l1Keys = this.l1Cache.keys();
      const l1MatchingKeys = l1Keys.filter(key => regex.test(key));
      l1MatchingKeys.forEach(key => {
        this.l1Cache.del(key);
        invalidatedCount++;
      });
      
      // Invalidate L2 cache
      const l2Keys = this.l2Cache.keys();
      const l2MatchingKeys = l2Keys.filter(key => regex.test(key));
      l2MatchingKeys.forEach(key => {
        this.l2Cache.del(key);
        invalidatedCount++;
      });
      
      console.log(`🗑️  Invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`);
      return invalidatedCount;
      
    } catch (error) {
      console.error(`❌ Cache invalidation error for pattern ${pattern}:`, error);
      return 0;
    }
  }
  
  /**
   * Warm cache with frequently accessed data
   * @param {string} siteId - Site ID to warm cache for
   * @returns {Promise<Object>} Warming results
   */
  async warmCache(siteId) {
    console.log(`🔥 Starting cache warming for site: ${siteId}`);
    
    const warmingResults = {
      siteId,
      startTime: new Date(),
      operations: [],
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0
    };
    
    try {
      this.stats.cacheWarming.requests++;
      
      // Define cache warming operations
      const warmingOperations = [
        {
          name: 'analytics_summary',
          key: this.generateCacheKey(this.config.keyPrefixes.analytics, siteId, { type: 'summary' }),
          operation: async () => {
            // This would call the actual analytics service
            // For now, we'll simulate the operation
            return { visitors: 0, pageViews: 0, walletsConnected: 0 };
          }
        },
        {
          name: 'chart_data_daily',
          key: this.generateCacheKey(this.config.keyPrefixes.chartData, siteId, { timeframe: 'daily' }),
          operation: async () => {
            return { labels: [], datasets: [] };
          }
        },
        {
          name: 'traffic_sources',
          key: this.generateCacheKey(this.config.keyPrefixes.trafficSources, siteId),
          operation: async () => {
            return { sources: [], campaigns: [] };
          }
        }
      ];
      
      // Execute warming operations
      for (const warmOp of warmingOperations) {
        const opResult = {
          name: warmOp.name,
          key: warmOp.key,
          success: false,
          executionTime: 0,
          error: null
        };
        
        try {
          const startTime = Date.now();
          const result = await warmOp.operation();
          opResult.executionTime = Date.now() - startTime;
          
          // Cache the result
          await this.set(warmOp.key, result, { useL2: true });
          
          opResult.success = true;
          warmingResults.successfulOperations++;
          
          console.log(`✅ Cache warmed: ${warmOp.name} (${opResult.executionTime}ms)`);
          
        } catch (error) {
          opResult.error = error.message;
          warmingResults.failedOperations++;
          
          console.error(`❌ Cache warming failed for ${warmOp.name}:`, error);
        }
        
        warmingResults.operations.push(opResult);
        warmingResults.totalOperations++;
      }
      
      warmingResults.endTime = new Date();
      warmingResults.totalTime = warmingResults.endTime - warmingResults.startTime;
      
      if (warmingResults.successfulOperations > 0) {
        this.stats.cacheWarming.successes++;
      } else {
        this.stats.cacheWarming.failures++;
      }
      
      console.log(`🔥 Cache warming completed for ${siteId}: ${warmingResults.successfulOperations}/${warmingResults.totalOperations} successful`);
      
      return warmingResults;
      
    } catch (error) {
      console.error(`❌ Cache warming error for site ${siteId}:`, error);
      this.stats.cacheWarming.failures++;
      
      warmingResults.error = error.message;
      warmingResults.endTime = new Date();
      
      return warmingResults;
    }
  }
  
  /**
   * Get comprehensive cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const l1Stats = this.l1Cache.getStats();
    const l2Stats = this.l2Cache.getStats();
    
    return {
      timestamp: new Date(),
      l1Cache: {
        ...this.stats.l1,
        keys: l1Stats.keys,
        hits: l1Stats.hits,
        misses: l1Stats.misses,
        hitRate: l1Stats.hits > 0 ? ((l1Stats.hits / (l1Stats.hits + l1Stats.misses)) * 100).toFixed(2) + '%' : '0%',
        memoryUsage: this.l1Cache.keys().length
      },
      l2Cache: {
        ...this.stats.l2,
        keys: l2Stats.keys,
        hits: l2Stats.hits,
        misses: l2Stats.misses,
        hitRate: l2Stats.hits > 0 ? ((l2Stats.hits / (l2Stats.hits + l2Stats.misses)) * 100).toFixed(2) + '%' : '0%',
        memoryUsage: this.l2Cache.keys().length
      },
      overall: {
        totalRequests: this.stats.totalRequests,
        cacheWarming: this.stats.cacheWarming
      },
      config: this.config
    };
  }
  
  /**
   * Clear all caches
   */
  clearAll() {
    const l1Keys = this.l1Cache.keys().length;
    const l2Keys = this.l2Cache.keys().length;
    
    this.l1Cache.flushAll();
    this.l2Cache.flushAll();
    
    console.log(`🗑️  Cleared all caches: ${l1Keys} L1 keys, ${l2Keys} L2 keys`);
  }
  
  /**
   * Get cache health status
   * @returns {Object} Health status
   */
  getHealth() {
    const stats = this.getStats();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      l1Cache: {
        operational: true,
        keyCount: stats.l1Cache.keys,
        hitRate: stats.l1Cache.hitRate,
        memoryUsage: stats.l1Cache.memoryUsage
      },
      l2Cache: {
        operational: true,
        keyCount: stats.l2Cache.keys,
        hitRate: stats.l2Cache.hitRate,
        memoryUsage: stats.l2Cache.memoryUsage
      },
      recommendations: this.getRecommendations(stats)
    };
  }
  
  /**
   * Get performance recommendations based on cache statistics
   * @param {Object} stats - Cache statistics
   * @returns {Array} Array of recommendations
   */
  getRecommendations(stats) {
    const recommendations = [];
    
    // Check hit rates
    const l1HitRate = parseFloat(stats.l1Cache.hitRate);
    const l2HitRate = parseFloat(stats.l2Cache.hitRate);
    
    if (l1HitRate < 70) {
      recommendations.push({
        type: 'performance',
        message: `L1 cache hit rate is low (${stats.l1Cache.hitRate}). Consider increasing TTL or cache warming.`,
        priority: 'medium'
      });
    }
    
    if (l2HitRate < 50) {
      recommendations.push({
        type: 'performance',
        message: `L2 cache hit rate is low (${stats.l2Cache.hitRate}). Review caching strategy.`,
        priority: 'medium'
      });
    }
    
    // Check memory usage
    if (stats.l1Cache.memoryUsage > this.config.l1.maxKeys * 0.9) {
      recommendations.push({
        type: 'memory',
        message: 'L1 cache is near capacity. Consider increasing maxKeys or reducing TTL.',
        priority: 'high'
      });
    }
    
    if (stats.l2Cache.memoryUsage > this.config.l2.maxKeys * 0.9) {
      recommendations.push({
        type: 'memory',
        message: 'L2 cache is near capacity. Consider increasing maxKeys or reducing TTL.',
        priority: 'high'
      });
    }
    
    return recommendations;
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;