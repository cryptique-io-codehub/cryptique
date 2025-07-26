/**
 * API Configuration Helpers
 * 
 * Centralized configuration utilities for CORS, middleware, and common API settings
 * extracted from existing backend and server implementations.
 */

const { RATE_LIMITS } = require('../common/constants');

/**
 * Create standardized CORS configuration
 * @param {Object} options - CORS configuration options
 * @returns {Object} - CORS configuration object
 */
const createCorsConfig = (options = {}) => {
  const {
    origins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://app.cryptique.io',
      'https://cryptique.io'
    ],
    credentials = true,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-API-Key'
    ],
    exposedHeaders = ['X-Total-Count', 'X-Page-Count'],
    maxAge = 86400, // 24 hours
    optionsSuccessStatus = 204
  } = options;

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (origins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow localhost in development
      if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
        return callback(null, true);
      }
      
      callback(new Error('Not allowed by CORS'));
    },
    credentials,
    methods,
    allowedHeaders,
    exposedHeaders,
    maxAge,
    optionsSuccessStatus
  };
};

/**
 * Create SDK-specific CORS configuration (more permissive)
 * @param {Object} options - CORS configuration options
 * @returns {Object} - SDK CORS configuration object
 */
const createSdkCorsConfig = (options = {}) => {
  const {
    origins = '*', // More permissive for SDK usage
    credentials = false, // SDK doesn't need credentials
    methods = ['GET', 'POST', 'OPTIONS'],
    allowedHeaders = [
      'Content-Type',
      'X-Requested-With',
      'Accept',
      'Origin'
    ],
    maxAge = 86400
  } = options;

  return {
    origin: origins,
    credentials,
    methods,
    allowedHeaders,
    maxAge,
    optionsSuccessStatus: 204
  };
};

/**
 * Create rate limiting configuration
 * @param {Object} options - Rate limiting options
 * @returns {Object} - Rate limiting configuration
 */
const createRateLimitConfig = (options = {}) => {
  const {
    windowMs = RATE_LIMITS.API_GENERAL.WINDOW_MS,
    max = RATE_LIMITS.API_GENERAL.MAX_REQUESTS,
    message = 'Too many requests from this IP, please try again later',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip,
    handler = (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.round(windowMs / 1000)
        }
      });
    }
  } = options;

  return {
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler
  };
};

/**
 * Create authentication rate limiting configuration (stricter)
 * @param {Object} options - Rate limiting options
 * @returns {Object} - Authentication rate limiting configuration
 */
const createAuthRateLimitConfig = (options = {}) => {
  return createRateLimitConfig({
    windowMs: RATE_LIMITS.AUTH_ENDPOINTS.WINDOW_MS,
    max: RATE_LIMITS.AUTH_ENDPOINTS.MAX_REQUESTS,
    message: 'Too many authentication attempts, please try again later',
    ...options
  });
};

/**
 * Create sensitive operations rate limiting configuration (very strict)
 * @param {Object} options - Rate limiting options
 * @returns {Object} - Sensitive operations rate limiting configuration
 */
const createSensitiveRateLimitConfig = (options = {}) => {
  return createRateLimitConfig({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Very strict limit
    message: 'Too many sensitive operations, please try again later',
    ...options
  });
};

/**
 * Create common middleware configuration
 * @param {Object} options - Middleware options
 * @returns {Object} - Middleware configuration
 */
const createMiddlewareConfig = (options = {}) => {
  const {
    bodyLimit = '10mb',
    urlEncoded = true,
    compression = true,
    helmet = true,
    morgan = process.env.NODE_ENV !== 'production',
    trustProxy = true
  } = options;

  return {
    bodyLimit,
    urlEncoded,
    compression,
    helmet,
    morgan,
    trustProxy
  };
};

/**
 * Create API key validation middleware configuration
 * @param {Object} options - API key options
 * @returns {Function} - API key validation middleware
 */
const createApiKeyValidator = (options = {}) => {
  const {
    headerName = 'x-api-key',
    envVarName = 'API_KEY',
    required = true,
    errorMessage = 'Invalid or missing API key'
  } = options;

  return (req, res, next) => {
    if (!required && !req.headers[headerName]) {
      return next();
    }

    const apiKey = req.headers[headerName];
    const validApiKey = process.env[envVarName];

    if (!apiKey || !validApiKey || apiKey !== validApiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: errorMessage
        }
      });
    }

    next();
  };
};

/**
 * Create health check API key validator (for monitoring endpoints)
 * @param {Object} options - Health check options
 * @returns {Function} - Health check API key validation middleware
 */
const createHealthCheckValidator = (options = {}) => {
  return createApiKeyValidator({
    headerName: 'x-api-key',
    envVarName: 'HEALTH_CHECK_API_KEY',
    required: true,
    errorMessage: 'Unauthorized access to health check endpoint',
    ...options
  });
};

/**
 * Create OPTIONS request handler
 * @param {Object} options - OPTIONS handler options
 * @returns {Function} - OPTIONS request handler middleware
 */
const createOptionsHandler = (options = {}) => {
  const { statusCode = 204 } = options;

  return (req, res, next) => {
    if (req.method === 'OPTIONS') {
      return res.status(statusCode).end();
    }
    next();
  };
};

/**
 * Create request logging configuration
 * @param {Object} options - Logging options
 * @returns {Object} - Logging configuration
 */
const createLoggingConfig = (options = {}) => {
  const {
    format = process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
    skip = (req, res) => {
      // Skip logging for health checks and static assets
      return req.url.includes('/health') || 
             req.url.includes('/favicon.ico') ||
             res.statusCode < 400;
    },
    stream = process.stdout
  } = options;

  return {
    format,
    skip,
    stream
  };
};

/**
 * Create timeout configuration for different operation types
 * @param {string} operationType - Type of operation (quick, standard, complex, upload)
 * @returns {number} - Timeout in milliseconds
 */
const getTimeoutForOperation = (operationType = 'standard') => {
  const timeouts = {
    quick: 5000,       // Health checks, simple reads
    standard: 15000,   // Most API operations
    complex: 30000,    // Complex queries, reports
    upload: 60000,     // File uploads
    batch: 120000      // Batch operations
  };

  return timeouts[operationType] || timeouts.standard;
};

/**
 * Create request timeout middleware
 * @param {string|number} timeout - Timeout value or operation type
 * @returns {Function} - Timeout middleware
 */
const createTimeoutMiddleware = (timeout = 'standard') => {
  const timeoutMs = typeof timeout === 'string' 
    ? getTimeoutForOperation(timeout) 
    : timeout;

  return (req, res, next) => {
    req.setTimeout(timeoutMs, () => {
      const error = new Error('Request timeout');
      error.statusCode = 408;
      error.code = 'REQUEST_TIMEOUT';
      next(error);
    });

    res.setTimeout(timeoutMs, () => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout'
          }
        });
      }
    });

    next();
  };
};

module.exports = {
  // CORS configurations
  createCorsConfig,
  createSdkCorsConfig,
  
  // Rate limiting configurations
  createRateLimitConfig,
  createAuthRateLimitConfig,
  createSensitiveRateLimitConfig,
  
  // Middleware configurations
  createMiddlewareConfig,
  createOptionsHandler,
  createLoggingConfig,
  
  // Security configurations
  createApiKeyValidator,
  createHealthCheckValidator,
  
  // Timeout configurations
  getTimeoutForOperation,
  createTimeoutMiddleware
};