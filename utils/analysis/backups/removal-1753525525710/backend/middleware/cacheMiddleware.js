/**
 * Cache middleware for analytics endpoints
 * Integrates with CacheService to provide intelligent caching
 */

const cacheService = require('../services/cacheService');

/**
 * Create cache middleware for analytics endpoints
 * @param {Object} options - Cache configuration options
 * @returns {Function} Express middleware function
 */
function createCacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    useL2 = true,
    keyGenerator = null,
    skipCache = false
  } = options;

  return async (req, res, next) => {
    // Skip caching if disabled
    if (skipCache) {
      return next();
    }
    
    // For non-GET requests, only cache if explicitly enabled
    if (req.method !== 'GET' && options.skipCache !== false) {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        cacheKey = generateDefaultCacheKey(req);
      }

      console.log(`🔍 Cache lookup for: ${cacheKey}`);

      // Try to get from cache
      const cachedData = await cacheService.get(cacheKey);
      
      if (cachedData !== null) {
        console.log(`🎯 Cache HIT: ${cacheKey}`);
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });
        
        return res.json(cachedData);
      }

      console.log(`❌ Cache MISS: ${cacheKey}`);

      // Store original res.json to intercept response
      const originalJson = res.json;
      
      res.json = function(data) {
        // Cache the response data
        if (res.statusCode === 200 && data) {
          cacheService.set(cacheKey, data, { ttl, useL2 })
            .then(() => {
              console.log(`💾 Cached response for: ${cacheKey}`);
            })
            .catch(error => {
              console.error(`❌ Failed to cache response for ${cacheKey}:`, error);
            });
        }

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'Cache-Control': `public, max-age=${ttl}`
        });

        // Call original res.json
        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      console.error('❌ Cache middleware error:', error);
      // Continue without caching on error
      next();
    }
  };
}

/**
 * Generate default cache key from request
 * @param {Object} req - Express request object
 * @returns {string} Generated cache key
 */
function generateDefaultCacheKey(req) {
  const { siteId, timeframe, start, end, userId, teamId } = req.query;
  const route = req.route.path;
  
  // Create base key from route and siteId
  let baseKey = `${route}:${siteId || 'unknown'}`;
  
  // Add parameters that affect the response
  const params = {};
  if (timeframe) params.timeframe = timeframe;
  if (start) params.start = start;
  if (end) params.end = end;
  if (userId) params.userId = userId;
  if (teamId) params.teamId = teamId;
  
  return cacheService.generateCacheKey(baseKey, '', params);
}

/**
 * Cache middleware specifically for chart data
 */
const chartDataCache = createCacheMiddleware({
  ttl: 300, // 5 minutes
  useL2: true,
  keyGenerator: (req) => {
    const { siteId, timeframe, start, end } = req.query;
    return cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.chartData,
      siteId,
      { timeframe, start, end }
    );
  }
});

/**
 * Cache middleware for traffic sources data
 */
const trafficSourcesCache = createCacheMiddleware({
  ttl: 900, // 15 minutes
  useL2: true,
  keyGenerator: (req) => {
    const { siteId, start, end } = req.query;
    return cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.trafficSources,
      siteId,
      { start, end }
    );
  }
});

/**
 * Cache middleware for user journeys data
 */
const userJourneysCache = createCacheMiddleware({
  ttl: 1800, // 30 minutes
  useL2: true,
  keyGenerator: (req) => {
    const { siteId, teamId, timeframe } = req.query;
    return cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.userJourneys,
      siteId,
      { teamId, timeframe }
    );
  }
});

/**
 * Cache middleware for user sessions data
 */
const userSessionsCache = createCacheMiddleware({
  ttl: 600, // 10 minutes
  useL2: true,
  keyGenerator: (req) => {
    const { userId } = req.query;
    return cacheService.generateCacheKey(
      cacheService.config.keyPrefixes.sessions,
      userId
    );
  }
});

/**
 * Cache invalidation middleware for data updates
 */
function createCacheInvalidationMiddleware(patterns) {
  return (req, res, next) => {
    // Store original res.json to intercept response
    const originalJson = res.json;
    
    res.json = function(data) {
      // Invalidate cache patterns on successful updates
      if (res.statusCode === 200 && patterns && patterns.length > 0) {
        patterns.forEach(pattern => {
          const invalidatedCount = cacheService.invalidate(pattern);
          console.log(`🗑️  Invalidated ${invalidatedCount} cache entries for pattern: ${pattern}`);
        });
      }

      // Call original res.json
      return originalJson.call(this, data);
    };

    next();
  };
}

module.exports = {
  createCacheMiddleware,
  chartDataCache,
  trafficSourcesCache,
  userJourneysCache,
  userSessionsCache,
  createCacheInvalidationMiddleware,
  cacheService
};