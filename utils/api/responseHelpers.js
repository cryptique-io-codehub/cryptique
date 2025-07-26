/**
 * Response Helper Utilities
 * 
 * Standardized response formatting functions for consistent API responses
 * across all services and endpoints.
 */

const { HTTP_STATUS, SUCCESS_MESSAGES, ERROR_MESSAGES } = require('../common/constants');

/**
 * Create a standardized success response
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 * @returns {Object} - Standardized success response
 */
const createSuccessResponse = (data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = {}) => {
  return {
    success: true,
    statusCode,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
};

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} - Standardized error response
 */
const createErrorResponse = (message = ERROR_MESSAGES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', details = {}) => {
  return {
    success: false,
    statusCode,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Create a paginated response
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {Object} - Standardized paginated response
 */
const createPaginatedResponse = (data = [], pagination = {}, message = 'Data retrieved successfully') => {
  const {
    page = 1,
    limit = 10,
    total = data.length,
    totalPages = Math.ceil(total / limit)
  } = pagination;

  return createSuccessResponse(data, message, HTTP_STATUS.OK, {
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages: parseInt(totalPages),
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
};

/**
 * Create a validation error response
 * @param {Array|Object} errors - Validation errors
 * @param {string} message - Error message
 * @returns {Object} - Standardized validation error response
 */
const createValidationErrorResponse = (errors = [], message = 'Validation failed') => {
  // Normalize errors to array format
  const normalizedErrors = Array.isArray(errors) ? errors : [errors];
  
  return createErrorResponse(
    message,
    HTTP_STATUS.UNPROCESSABLE_ENTITY,
    'VALIDATION_ERROR',
    { errors: normalizedErrors }
  );
};

/**
 * Create an authentication error response
 * @param {string} message - Error message
 * @returns {Object} - Standardized authentication error response
 */
const createAuthErrorResponse = (message = ERROR_MESSAGES.UNAUTHORIZED) => {
  return createErrorResponse(
    message,
    HTTP_STATUS.UNAUTHORIZED,
    'AUTHENTICATION_ERROR'
  );
};

/**
 * Create an authorization error response
 * @param {string} message - Error message
 * @returns {Object} - Standardized authorization error response
 */
const createForbiddenResponse = (message = ERROR_MESSAGES.FORBIDDEN) => {
  return createErrorResponse(
    message,
    HTTP_STATUS.FORBIDDEN,
    'AUTHORIZATION_ERROR'
  );
};

/**
 * Create a not found error response
 * @param {string} resource - Resource that was not found
 * @param {string} message - Custom error message
 * @returns {Object} - Standardized not found error response
 */
const createNotFoundResponse = (resource = 'Resource', message = null) => {
  const errorMessage = message || `${resource} not found`;
  
  return createErrorResponse(
    errorMessage,
    HTTP_STATUS.NOT_FOUND,
    'NOT_FOUND',
    { resource }
  );
};

/**
 * Create a conflict error response
 * @param {string} message - Error message
 * @param {Object} details - Additional conflict details
 * @returns {Object} - Standardized conflict error response
 */
const createConflictResponse = (message = 'Resource already exists', details = {}) => {
  return createErrorResponse(
    message,
    HTTP_STATUS.CONFLICT,
    'CONFLICT_ERROR',
    details
  );
};

/**
 * Create a rate limit error response
 * @param {string} message - Error message
 * @param {Object} rateLimitInfo - Rate limit information
 * @returns {Object} - Standardized rate limit error response
 */
const createRateLimitResponse = (message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, rateLimitInfo = {}) => {
  return createErrorResponse(
    message,
    HTTP_STATUS.TOO_MANY_REQUESTS,
    'RATE_LIMIT_EXCEEDED',
    rateLimitInfo
  );
};

/**
 * Send a standardized response using Express response object
 * @param {Object} res - Express response object
 * @param {Object} responseData - Response data object
 * @returns {Object} - Express response
 */
const sendResponse = (res, responseData) => {
  const { statusCode = HTTP_STATUS.OK } = responseData;
  return res.status(statusCode).json(responseData);
};

/**
 * Send a success response using Express response object
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 * @returns {Object} - Express response
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = HTTP_STATUS.OK, meta = {}) => {
  const response = createSuccessResponse(data, message, statusCode, meta);
  return sendResponse(res, response);
};

/**
 * Send an error response using Express response object
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {Object} details - Additional error details
 * @returns {Object} - Express response
 */
const sendError = (res, message = ERROR_MESSAGES.INTERNAL_ERROR, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, code = 'INTERNAL_ERROR', details = {}) => {
  const response = createErrorResponse(message, statusCode, code, details);
  return sendResponse(res, response);
};

/**
 * Send a paginated response using Express response object
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 * @returns {Object} - Express response
 */
const sendPaginated = (res, data = [], pagination = {}, message = 'Data retrieved successfully') => {
  const response = createPaginatedResponse(data, pagination, message);
  return sendResponse(res, response);
};

/**
 * Handle async route errors and send appropriate response
 * @param {Function} asyncFn - Async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (asyncFn) => {
  return (req, res, next) => {
    Promise.resolve(asyncFn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @returns {Object} - Express response
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Global error handler:', err);
  
  // Handle different types of errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return sendResponse(res, createValidationErrorResponse(errors));
  }
  
  if (err.name === 'CastError') {
    return sendResponse(res, createErrorResponse(
      'Invalid ID format',
      HTTP_STATUS.BAD_REQUEST,
      'INVALID_ID'
    ));
  }
  
  if (err.code === 11000) { // MongoDB duplicate key error
    const field = Object.keys(err.keyValue)[0];
    return sendResponse(res, createConflictResponse(
      `${field} already exists`,
      { field, value: err.keyValue[field] }
    ));
  }
  
  if (err.name === 'JsonWebTokenError') {
    return sendResponse(res, createAuthErrorResponse('Invalid token'));
  }
  
  if (err.name === 'TokenExpiredError') {
    return sendResponse(res, createAuthErrorResponse('Token expired'));
  }
  
  // Default to internal server error
  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = process.env.NODE_ENV === 'production' 
    ? ERROR_MESSAGES.INTERNAL_ERROR 
    : err.message;
  
  return sendResponse(res, createErrorResponse(message, statusCode, 'INTERNAL_ERROR'));
};

module.exports = {
  // Response creators
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createRateLimitResponse,
  
  // Response senders
  sendResponse,
  sendSuccess,
  sendError,
  sendPaginated,
  
  // Middleware helpers
  asyncHandler,
  globalErrorHandler
};