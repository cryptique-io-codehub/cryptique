const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

/**
 * Create rate limiter middleware with different tiers
 * Uses in-memory store by default, Redis store if available
 */
const createRateLimiter = (options = {}) => {
  const {
    redis = null,  // Redis connection URL or instance
    prefix = 'rl:', // Redis key prefix
    environment = process.env.NODE_ENV || 'development'
  } = options;
  
  // Default rate limits by env (requests per window)
  const defaultLimits = {
    development: {
      windowMs: 60 * 1000, // 1 minute
      max: 1000 // Higher limit for development
    },
    test: {
      windowMs: 60 * 1000, // 1 minute
      max: 1000 // Higher limit for testing
    },
    production: {
      windowMs: 60 * 1000, // 1 minute
      max: 100 // Lower limit for production
    }
  };
  
  // Get environment defaults
  const envDefaults = defaultLimits[environment] || defaultLimits.development;
  
  // Create Redis client if Redis info is provided
  let redisClient = null;
  if (redis) {
    try {
      // If redis is a string URL
      if (typeof redis === 'string') {
        redisClient = new Redis(redis);
      } 
      // If redis is already a Redis instance
      else if (redis instanceof Redis) {
        redisClient = redis;
      }
      
      // Log Redis connection
      console.log('Rate limiter using Redis store');
    } catch (error) {
      console.error('Failed to connect to Redis for rate limiting, falling back to memory store:', error.message);
      redisClient = null;
    }
  }
  
  // Configure store (Redis if available, otherwise memory)
  const limiterStore = redisClient 
    ? new RedisStore({
        // Redis client
        client: redisClient,
        // Key prefix
        prefix,
        // Don't reset counters when app restarts
        resetExpiryOnChange: false
      })
    : undefined; // Default to memory store

  // Create different rate limiters for different API tiers
  const createLimiter = (tierOptions = {}) => {
    const {
      windowMs = envDefaults.windowMs,
      max = envDefaults.max,
      message = 'Too many requests, please try again later.',
      standardHeaders = true, // Return rate limit info in the headers
      legacyHeaders = false,  // Don't use deprecated headers
      handler = null,        // Custom handler function
      skipFailedRequests = false, // Don't count failed requests
      requestPropertyName = 'rateLimit' // Property on req object
    } = tierOptions;
    
    return rateLimit({
      windowMs,
      max,
      message,
      standardHeaders,
      legacyHeaders,
      handler,
      store: limiterStore,
      skipFailedRequests,
      requestPropertyName
    });
  };
  
  // Define different rate limiting tiers
  return {
    // Standard rate limit for most API endpoints
    standard: createLimiter(),
    
    // More restrictive limit for authentication endpoints
    auth: createLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: environment === 'production' ? 20 : 100, // 20 requests per 15 minutes in production
      message: 'Too many authentication attempts, please try again later.'
    }),
    
    // Limit for public analytics endpoints
    analytics: createLimiter({
      windowMs: 60 * 1000, // 1 minute
      max: environment === 'production' ? 30 : 300, // 30 requests per minute in production
      message: 'Too many analytics requests, please try again later.'
    }),
    
    // Very restrictive limit for sensitive operations
    sensitive: createLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: environment === 'production' ? 10 : 50, // 10 requests per hour in production
      message: 'Too many sensitive operation requests, please try again later.'
    }),
    
    // Custom limiter factory for special cases
    custom: createLimiter
  };
};

module.exports = createRateLimiter; 