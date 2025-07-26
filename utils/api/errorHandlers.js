/**
 * Error Handler Utilities
 * 
 * Centralized error handling utilities for consistent error processing,
 * logging, and response formatting across all services.
 */

const { HTTP_STATUS, ERROR_MESSAGES } = require('../common/constants');

/**
 * Custom error classes for different types of application errors
 */

class AppError extends Error {
  constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = {}) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = ERROR_MESSAGES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource', message = null) {
    const errorMessage = message || `${resource} not found`;
    super(errorMessage, HTTP_STATUS.NOT_FOUND, 'NOT_FOUND', { resource });
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details = {}) {
    super(message, HTTP_STATUS.CONFLICT, 'CONFLICT_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, rateLimitInfo = {}) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMIT_EXCEEDED', rateLimitInfo);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad request', details = {}) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST', details);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details = {}) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE', details);
  }
}

/**
 * Error handling utilities
 */

/**
 * Handle common authentication errors
 * @param {Error} error - Original error
 * @returns {AppError} - Standardized authentication error
 */
const handleAuthError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  
  if (error.message === 'No token provided') {
    return new AuthenticationError('No token provided');
  }
  
  return new AuthenticationError(error.message);
};

/**
 * Handle database-related errors
 * @param {Error} error - Database error
 * @returns {AppError} - Standardized database error
 */
const handleDatabaseError = (error) => {
  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return new ValidationError('Validation failed', { errors });
  }
  
  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return new BadRequestError('Invalid ID format', { field: error.path, value: error.value });
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return new ConflictError(`${field} already exists`, { 
      field, 
      value: error.keyValue[field] 
    });
  }
  
  // Connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    return new ServiceUnavailableError('Database connection error');
  }
  
  return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR');
};

/**
 * Handle subscription-related errors
 * @param {Error} error - Subscription error
 * @returns {AppError} - Standardized subscription error
 */
const handleSubscriptionError = (error) => {
  if (error.message.includes('Resource limit reached')) {
    return new AuthorizationError(error.message);
  }
  
  if (error.message.includes('Subscription required')) {
    return new AuthorizationError(error.message);
  }
  
  if (error.message.includes('grace period')) {
    return new AuthorizationError(error.message);
  }
  
  return new AppError(error.message, HTTP_STATUS.PAYMENT_REQUIRED, 'SUBSCRIPTION_ERROR');
};

/**
 * Handle API client errors (axios, fetch, etc.)
 * @param {Error} error - API client error
 * @returns {AppError} - Standardized API error
 */
const handleApiError = (error) => {
  // Axios error
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.error || data?.message || 'API request failed';
    
    if (status === 400) return new BadRequestError(message);
    if (status === 401) return new AuthenticationError(message);
    if (status === 403) return new AuthorizationError(message);
    if (status === 404) return new NotFoundError('Resource', message);
    if (status === 409) return new ConflictError(message);
    if (status === 429) return new RateLimitError(message);
    if (status >= 500) return new ServiceUnavailableError(message);
    
    return new AppError(message, status, 'API_ERROR');
  }
  
  // Network error
  if (error.request) {
    return new ServiceUnavailableError('Network error - unable to reach API');
  }
  
  return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR, 'API_ERROR');
};

/**
 * Log error with appropriate level and context
 * @param {Error} error - Error to log
 * @param {Object} context - Additional context for logging
 */
const logError = (error, context = {}) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    ...context
  };
  
  // Log operational errors as warnings, system errors as errors
  if (error.isOperational) {
    console.warn('Operational Error:', JSON.stringify(logData, null, 2));
  } else {
    console.error('System Error:', JSON.stringify(logData, null, 2));
  }
};

/**
 * Create error response middleware for Express
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorMiddleware = (err, req, res, next) => {
  // Log the error
  logError(err, {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  let error = err;
  
  // Convert known error types to AppError
  if (!(error instanceof AppError)) {
    if (error.name === 'ValidationError' || error.name === 'CastError' || error.code === 11000) {
      error = handleDatabaseError(error);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = handleAuthError(error);
    } else if (error.response || error.request) {
      error = handleApiError(error);
    } else {
      error = new AppError(
        process.env.NODE_ENV === 'production' ? ERROR_MESSAGES.INTERNAL_ERROR : error.message,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'INTERNAL_ERROR'
      );
    }
  }
  
  // Create error response directly to avoid circular dependency
  const errorResponse = {
    success: false,
    statusCode: error.statusCode,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString()
    }
  };
  
  res.status(error.statusCode).json(errorResponse);
};

/**
 * Async error handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Close server gracefully
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Close server gracefully
    process.exit(1);
  });
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadRequestError,
  ServiceUnavailableError,
  
  // Error handlers
  handleAuthError,
  handleDatabaseError,
  handleSubscriptionError,
  handleApiError,
  
  // Middleware and utilities
  errorMiddleware,
  asyncErrorHandler,
  logError,
  
  // Process handlers
  handleUnhandledRejection,
  handleUncaughtException
};