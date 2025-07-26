/**
 * Database Error Handler Utilities
 * Standardized error handling for database operations
 */

/**
 * Database error types
 */
const ERROR_TYPES = {
  VALIDATION_ERROR: 'ValidationError',
  DUPLICATE_KEY_ERROR: 'DuplicateKeyError',
  CAST_ERROR: 'CastError',
  CONNECTION_ERROR: 'ConnectionError',
  TIMEOUT_ERROR: 'TimeoutError',
  NOT_FOUND_ERROR: 'NotFoundError',
  PERMISSION_ERROR: 'PermissionError'
};

/**
 * Parse MongoDB error and return standardized error object
 * @param {Error} error - MongoDB error
 * @param {string} operation - Operation that failed
 * @returns {Object} Standardized error object
 */
const parseMongoError = (error, operation = 'database operation') => {
  const errorResponse = {
    success: false,
    operation,
    timestamp: new Date().toISOString()
  };

  // Validation errors
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return {
      ...errorResponse,
      type: ERROR_TYPES.VALIDATION_ERROR,
      message: 'Validation failed',
      details: validationErrors,
      statusCode: 400
    };
  }

  // Duplicate key errors (E11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'unknown';
    const value = error.keyValue ? error.keyValue[field] : 'unknown';
    
    return {
      ...errorResponse,
      type: ERROR_TYPES.DUPLICATE_KEY_ERROR,
      message: `Duplicate value for field: ${field}`,
      details: {
        field,
        value,
        constraint: 'unique'
      },
      statusCode: 409
    };
  }

  // Cast errors (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return {
      ...errorResponse,
      type: ERROR_TYPES.CAST_ERROR,
      message: `Invalid ${error.kind} for field: ${error.path}`,
      details: {
        field: error.path,
        value: error.value,
        expectedType: error.kind
      },
      statusCode: 400
    };
  }

  // Connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoServerError') {
    return {
      ...errorResponse,
      type: ERROR_TYPES.CONNECTION_ERROR,
      message: 'Database connection error',
      details: {
        originalMessage: error.message
      },
      statusCode: 503
    };
  }

  // Timeout errors
  if (error.name === 'MongoTimeoutError' || error.message.includes('timeout')) {
    return {
      ...errorResponse,
      type: ERROR_TYPES.TIMEOUT_ERROR,
      message: 'Database operation timed out',
      details: {
        originalMessage: error.message
      },
      statusCode: 504
    };
  }

  // Generic database error
  return {
    ...errorResponse,
    type: 'DatabaseError',
    message: error.message || 'Database operation failed',
    details: {
      originalError: error.name,
      originalMessage: error.message
    },
    statusCode: 500
  };
};

/**
 * Handle database operation errors with logging
 * @param {Error} error - Error object
 * @param {string} operation - Operation description
 * @param {Object} context - Additional context
 * @returns {Object} Standardized error response
 */
const handleDatabaseError = (error, operation, context = {}) => {
  const parsedError = parseMongoError(error, operation);
  
  // Log error with context
  console.error('Database Error:', {
    ...parsedError,
    context,
    stack: error.stack
  });
  
  return parsedError;
};

/**
 * Create a not found error
 * @param {string} resource - Resource type
 * @param {string} identifier - Resource identifier
 * @returns {Object} Not found error object
 */
const createNotFoundError = (resource, identifier) => {
  return {
    success: false,
    type: ERROR_TYPES.NOT_FOUND_ERROR,
    message: `${resource} not found`,
    details: {
      resource,
      identifier
    },
    statusCode: 404,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a permission error
 * @param {string} operation - Attempted operation
 * @param {string} resource - Resource type
 * @returns {Object} Permission error object
 */
const createPermissionError = (operation, resource) => {
  return {
    success: false,
    type: ERROR_TYPES.PERMISSION_ERROR,
    message: `Permission denied for ${operation} on ${resource}`,
    details: {
      operation,
      resource
    },
    statusCode: 403,
    timestamp: new Date().toISOString()
  };
};

/**
 * Wrap async database operations with error handling
 * @param {Function} operation - Async operation function
 * @param {string} operationName - Operation name for logging
 * @returns {Function} Wrapped operation
 */
const wrapDatabaseOperation = (operation, operationName) => {
  return async (...args) => {
    try {
      const result = await operation(...args);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorResponse = handleDatabaseError(error, operationName, { args });
      throw errorResponse;
    }
  };
};

/**
 * Validate ObjectId format
 * @param {string} id - ID to validate
 * @param {string} fieldName - Field name for error message
 * @throws {Object} Validation error if invalid
 */
const validateObjectId = (id, fieldName = 'id') => {
  const mongoose = require('mongoose');
  
  if (!id) {
    throw {
      success: false,
      type: ERROR_TYPES.VALIDATION_ERROR,
      message: `${fieldName} is required`,
      details: {
        field: fieldName,
        message: 'Field is required'
      },
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw {
      success: false,
      type: ERROR_TYPES.VALIDATION_ERROR,
      message: `Invalid ${fieldName} format`,
      details: {
        field: fieldName,
        value: id,
        message: 'Must be a valid ObjectId'
      },
      statusCode: 400,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Create standardized success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Success response
 */
const createSuccessResponse = (data, message = 'Operation successful') => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle transaction errors specifically
 * @param {Error} error - Transaction error
 * @param {string} operation - Operation description
 * @returns {Object} Transaction error response
 */
const handleTransactionError = (error, operation) => {
  if (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) {
    return {
      success: false,
      type: 'TransientTransactionError',
      message: 'Transaction failed due to temporary issue, retry recommended',
      details: {
        operation,
        retryable: true,
        originalMessage: error.message
      },
      statusCode: 503,
      timestamp: new Date().toISOString()
    };
  }
  
  return handleDatabaseError(error, operation);
};

module.exports = {
  ERROR_TYPES,
  parseMongoError,
  handleDatabaseError,
  createNotFoundError,
  createPermissionError,
  wrapDatabaseOperation,
  validateObjectId,
  createSuccessResponse,
  handleTransactionError
};