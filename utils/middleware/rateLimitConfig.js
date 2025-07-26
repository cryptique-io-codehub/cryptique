/**
 * Centralized Rate Limiting Configuration
 * 
 * This module provides standardized rate limiting configurations for different types of routes
 * and services across the application. It consolidates all rate limiting logic into a single
 * location for easier maintenance and consistency.
 */

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { RATE_LIMITS } = require('../common/constants');

/**
 * Default rate limiting configurations for different environments
 */
const ENVIRONMENT_DEFAULTS = {
  development: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Higher limit for development
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },
  test: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Higher limit for testing
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },
  production: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Lower limit for production
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  }
};

/**
 * Get environment-specific defaults
 * @returns {Object} - Environment defaults
 */
function getEnvironmentDefaults() {
  const env = process.env.NODE_ENV || 'development';
  return ENVIRONMENT_DEFAULTS[env] || ENVIRONMENT_DEFAULTS.development;
}

/**
 * Create a standardized error handler for rate limiting
 * @param {string} message - Custom error message
 * @returns {Function} - Rate limit error handler
 */
function createRateLimitHandler(message = 'Too many requests, please try again later') {
  return (req, res) => {
    const retryAfter = Math.round(req.rateLimit.resetTime / 1000);
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        details: {
          limit: req.rateLimit.limit,
          current: req.rateLimit.current,
          remaining: req.rateLimit.remaining,
          resetTime: new Date(req.rateLimit.resetTime).toISOString(),
          retryAfter
        }
      }
    });
  };
}

/**
 * Rate limiting configurations for different route types
 */
const rateLimitConfigurations = {
  /**
   * Standard rate limiting for most API routes
   */
  standard: {
    windowMs: RATE_LIMITS.API_GENERAL.WINDOW_MS,
    max: RATE_LIMITS.API_GENERAL.MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler(),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  /**
   * Authentication rate limiting - stricter for security
   */
  auth: {
    windowMs: RATE_LIMITS.AUTH_ENDPOINTS.WINDOW_MS,
    max: RATE_LIMITS.AUTH_ENDPOINTS.MAX_REQUESTS,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many authentication attempts, please try again later'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  /**
   * Analytics rate limiting - moderate for public endpoints
   */
  analytics: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 30 : 300,
    message: 'Too many analytics requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many analytics requests, please try again later'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  /**
   * SDK rate limiting - permissive for public SDK usage
   */
  sdk: {
    windowMs: 60 * 1000, // 1 minute
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: 'Too many SDK requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many SDK requests, please try again later'),
    keyGenerator: (req) => {
      // Use site ID if available, otherwise fall back to IP
      return req.headers['x-cryptique-site-id'] || req.ip;
    },
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  /**
   * Sensitive operations rate limiting - very strict
   */
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: 'Too many sensitive operation requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many sensitive operation requests, please try again later'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  },

  /**
   * Login failure rate limiting - tracks failed login attempts specifically
   */
  loginFailure: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Very strict for failed logins
    message: 'Too many failed login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many failed login attempts, please try again later'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: true, // Only count failed attempts
    skip: (req, res) => {
      // Skip if login was successful (determined by response)
      return res.statusCode < 400;
    }
  },

  /**
   * Health check rate limiting - very permissive
   */
  health: {
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // Very high limit for health checks
    message: 'Too many health check requests',
    standardHeaders: false, // Don't expose rate limit info for health checks
    legacyHeaders: false,
    handler: createRateLimitHandler('Too many health check requests'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: true,
    skipSuccessfulRequests: false
  },

  /**
   * Development rate limiting - very permissive for local development
   */
  development: {
    windowMs: 60 * 1000, // 1 minute
    max: 10000, // Very high limit
    message: 'Rate limit exceeded (development mode)',
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRateLimitHandler('Rate limit exceeded (development mode)'),
    keyGenerator: ipKeyGenerator,
    skipFailedRequests: false,
    skipSuccessfulRequests: false
  }
};

/**
 * Get rate limiting middleware for a specific configuration
 * @param {string} type - The type of rate limiting configuration
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Function} - Express rate limiting middleware
 */
function getRateLimitMiddleware(type = 'standard', customOptions = {}) {
  const config = rateLimitConfigurations[type];
  if (!config) {
    throw new Error(`Unknown rate limiting configuration type: ${type}`);
  }
  
  // Merge environment defaults with configuration and custom options
  const envDefaults = getEnvironmentDefaults();
  const finalConfig = { 
    ...envDefaults, 
    ...config, 
    ...customOptions 
  };
  
  return rateLimit(finalConfig);
}

/**
 * Create a custom rate limiter with specific options
 * @param {Object} options - Rate limiting options
 * @returns {Function} - Express rate limiting middleware
 */
function createCustomRateLimit(options = {}) {
  const envDefaults = getEnvironmentDefaults();
  const defaultConfig = rateLimitConfigurations.standard;
  
  const finalConfig = {
    ...envDefaults,
    ...defaultConfig,
    ...options
  };
  
  return rateLimit(finalConfig);
}

/**
 * Environment-aware rate limiting
 * Returns appropriate rate limiting based on NODE_ENV
 * @param {string} type - The type of rate limiting configuration
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Function} - Express rate limiting middleware
 */
function getEnvironmentRateLimit(type = 'standard', customOptions = {}) {
  if (process.env.NODE_ENV === 'development') {
    return getRateLimitMiddleware('development', customOptions);
  }
  
  return getRateLimitMiddleware(type, customOptions);
}

/**
 * Create rate limiting middleware with Redis store support
 * @param {string} type - The type of rate limiting configuration
 * @param {Object} redisOptions - Redis configuration options
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Function} - Express rate limiting middleware with Redis store
 */
function getRateLimitWithRedis(type = 'standard', redisOptions = {}, customOptions = {}) {
  try {
    const RedisStore = require('rate-limit-redis');
    const Redis = require('ioredis');
    
    const {
      redisUrl = process.env.REDIS_URL,
      keyPrefix = 'rl:',
      resetExpiryOnChange = false
    } = redisOptions;
    
    if (!redisUrl) {
      console.warn('Redis URL not provided, falling back to memory store');
      return getRateLimitMiddleware(type, customOptions);
    }
    
    const redisClient = new Redis(redisUrl);
    const store = new RedisStore({
      client: redisClient,
      prefix: keyPrefix,
      resetExpiryOnChange
    });
    
    return getRateLimitMiddleware(type, { ...customOptions, store });
  } catch (error) {
    console.error('Failed to create Redis rate limiter, falling back to memory store:', error.message);
    return getRateLimitMiddleware(type, customOptions);
  }
}

/**
 * Create multiple rate limiters for different tiers
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing different rate limiters
 */
function createRateLimiters(options = {}) {
  const { redis = null, environment = process.env.NODE_ENV } = options;
  
  const createLimiter = (type, customOptions = {}) => {
    if (redis) {
      return getRateLimitWithRedis(type, { redisUrl: redis }, customOptions);
    }
    return getRateLimitMiddleware(type, customOptions);
  };
  
  return {
    standard: createLimiter('standard'),
    auth: createLimiter('auth'),
    analytics: createLimiter('analytics'),
    sdk: createLimiter('sdk'),
    sensitive: createLimiter('sensitive'),
    loginFailure: createLimiter('loginFailure'),
    health: createLimiter('health'),
    development: createLimiter('development'),
    
    // Custom limiter factory
    custom: (options) => createCustomRateLimit(options)
  };
}

module.exports = {
  // Main functions
  getRateLimitMiddleware,
  createCustomRateLimit,
  getEnvironmentRateLimit,
  getRateLimitWithRedis,
  createRateLimiters,
  
  // Configuration objects
  rateLimitConfigurations,
  ENVIRONMENT_DEFAULTS,
  
  // Utility functions
  createRateLimitHandler,
  getEnvironmentDefaults
};