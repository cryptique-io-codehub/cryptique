/**
 * Route helper utilities for common route patterns
 * Provides reusable middleware and helper functions for consistent route handling
 */

/**
 * Async error handler wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standard error response formatter
 * Provides consistent error response format across all routes
 */
const sendErrorResponse = (res, statusCode, message, error = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Include error details in development
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error.message;
    response.stack = error.stack;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Standard success response formatter
 * Provides consistent success response format across all routes
 */
const sendSuccessResponse = (res, data, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  return res.status(statusCode).json(response);
};

/**
 * Request validation middleware factory
 * Creates middleware to validate required fields in request body/query/params
 */
const validateRequest = (validationRules) => {
  return (req, res, next) => {
    const errors = [];
    
    // Validate body fields
    if (validationRules.body) {
      for (const field of validationRules.body) {
        if (!req.body || !req.body[field]) {
          errors.push(`${field} is required in request body`);
        }
      }
    }
    
    // Validate query parameters
    if (validationRules.query) {
      for (const field of validationRules.query) {
        if (!req.query || !req.query[field]) {
          errors.push(`${field} is required in query parameters`);
        }
      }
    }
    
    // Validate URL parameters
    if (validationRules.params) {
      for (const field of validationRules.params) {
        if (!req.params || !req.params[field]) {
          errors.push(`${field} is required in URL parameters`);
        }
      }
    }
    
    if (errors.length > 0) {
      return sendErrorResponse(res, 400, 'Validation failed', { details: errors });
    }
    
    next();
  };
};

/**
 * Database operation wrapper with error handling
 * Wraps database operations with consistent error handling
 */
const dbOperation = async (operation, errorMessage = 'Database operation failed') => {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new Error(errorMessage);
  }
};

/**
 * Cache key generator
 * Creates consistent cache keys for different endpoints
 */
const createCacheKey = (prefix, params) => {
  return `${prefix}:${Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join(':')}`;
};

/**
 * Standard route middleware factory
 * Creates a complete route handler with common middleware applied
 */
const createRoute = (options = {}) => {
  const {
    auth = null,           // Authentication middleware type
    rateLimit = null,      // Rate limit type
    cors = null,           // CORS configuration type
    validation = null,     // Validation rules
    cache = null          // Cache configuration
  } = options;
  
  return (handler) => {
    const middlewares = [];
    
    // Apply CORS if specified
    if (cors) {
      const { getCorsMiddleware } = require('./corsConfig');
      middlewares.push(getCorsMiddleware(cors));
    }
    
    // Apply rate limiting if specified
    if (rateLimit) {
      const { getRateLimitMiddleware } = require('./rateLimitConfig');
      middlewares.push(getRateLimitMiddleware(rateLimit));
    }
    
    // Apply authentication if specified
    if (auth) {
      const { getAuthMiddleware } = require('./authMiddleware');
      middlewares.push(getAuthMiddleware(auth));
    }
    
    // Apply validation if specified
    if (validation) {
      middlewares.push(validateRequest(validation));
    }
    
    // Apply async error handling
    middlewares.push(asyncHandler(handler));
    
    return middlewares;
  };
};

/**
 * Health check route factory
 * Creates standardized health check endpoints
 */
const createHealthCheck = (checks = {}) => {
  return asyncHandler(async (req, res) => {
    const results = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    // Run custom health checks
    for (const [name, checkFn] of Object.entries(checks)) {
      try {
        results[name] = await checkFn();
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message
        };
        results.status = 'degraded';
      }
    }
    
    const statusCode = results.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(results);
  });
};

/**
 * Pagination helper
 * Standardizes pagination parameters and response format
 */
const handlePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
  const skip = (page - 1) * limit;
  
  return {
    page,
    limit,
    skip,
    createResponse: (data, total) => ({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    })
  };
};

/**
 * Date range validation helper
 * Validates and parses date range parameters
 */
const validateDateRange = (req) => {
  const { start, end } = req.query;
  
  let startDate = null;
  let endDate = null;
  
  if (start) {
    startDate = new Date(start);
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date format');
    }
  }
  
  if (end) {
    endDate = new Date(end);
    if (isNaN(endDate.getTime())) {
      throw new Error('Invalid end date format');
    }
  }
  
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date cannot be after end date');
  }
  
  return { startDate, endDate };
};

module.exports = {
  asyncHandler,
  sendErrorResponse,
  sendSuccessResponse,
  validateRequest,
  dbOperation,
  createCacheKey,
  createRoute,
  createHealthCheck,
  handlePagination,
  validateDateRange
};