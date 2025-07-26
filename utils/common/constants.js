/**
 * Application Constants
 * 
 * Centralized constants used throughout the application.
 * This helps maintain consistency and makes it easier to update values.
 */

// Authentication constants
const AUTH = {
  ACCESS_TOKEN_EXPIRY: '2h',
  REFRESH_TOKEN_EXPIRY_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  OTP_EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_TIME_MS: 60 * 60 * 1000 // 1 hour
};

// Rate limiting constants
const RATE_LIMITS = {
  API_GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH_ENDPOINTS: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 10
  },
  LOGIN_FAILURES: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 5
  }
};

// Database constants
const DATABASE = {
  CONNECTION_TIMEOUT_MS: 30000,
  QUERY_TIMEOUT_MS: 15000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Common error messages
const ERROR_MESSAGES = {
  INVALID_INPUT: 'Invalid input provided',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  VALIDATION_FAILED: 'Validation failed',
  DATABASE_ERROR: 'Database operation failed'
};

// Success messages
const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  OTP_SENT: 'OTP sent successfully',
  OTP_VERIFIED: 'OTP verified successfully'
};

// Environment constants
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production'
};

module.exports = {
  AUTH,
  RATE_LIMITS,
  DATABASE,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  ENVIRONMENTS
};