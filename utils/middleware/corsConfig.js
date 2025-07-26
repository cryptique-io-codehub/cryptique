/**
 * Centralized CORS Configuration
 * 
 * This module provides standardized CORS configurations for different types of routes
 * and services across the application. It consolidates all CORS logic into a single
 * location for easier maintenance and consistency.
 */

const cors = require('cors');

/**
 * Default allowed origins for the application
 */
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'https://app.cryptique.io',
  'https://cryptique.io',
  'https://auth.cryptique.io'
];

/**
 * Common CORS headers used across the application
 */
const COMMON_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'Origin',
  'X-Requested-With'
];

/**
 * SDK-specific headers
 */
const SDK_HEADERS = [
  ...COMMON_HEADERS,
  'x-cryptique-site-id'
];

/**
 * Auth-specific headers (more permissive for authentication flows)
 */
const AUTH_HEADERS = [
  ...COMMON_HEADERS,
  'Access-Control-Request-Method',
  'Access-Control-Request-Headers'
];

/**
 * Standard HTTP methods
 */
const STANDARD_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
const AUTH_METHODS = [...STANDARD_METHODS, 'PATCH'];

/**
 * Origin validation function
 * @param {string} origin - The origin to validate
 * @param {string[]} allowedOrigins - Array of allowed origins
 * @returns {boolean} - Whether the origin is allowed
 */
function isOriginAllowed(origin, allowedOrigins = DEFAULT_ALLOWED_ORIGINS) {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return true;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // Check for localhost patterns in development
  if (process.env.NODE_ENV !== 'production') {
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return true;
    }
  }
  
  // Check for cryptique.io subdomains
  if (origin.includes('cryptique.io')) {
    return true;
  }
  
  return false;
}

/**
 * Create CORS options for different route types
 */
const corsConfigurations = {
  /**
   * Standard CORS configuration for most API routes
   */
  standard: {
    origin: function(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: STANDARD_METHODS,
    allowedHeaders: COMMON_HEADERS,
    credentials: true,
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 200
  },

  /**
   * SDK CORS configuration - more permissive for public SDK usage
   */
  sdk: {
    origin: function(origin, callback) {
      // SDK routes are more permissive to allow embedding
      if (!origin || isOriginAllowed(origin, ['*'])) {
        callback(null, origin || '*');
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: SDK_HEADERS,
    exposedHeaders: ['Access-Control-Allow-Origin'],
    credentials: false, // SDK doesn't need credentials for security
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
  },

  /**
   * Authentication CORS configuration - strict but supports auth flows
   */
  auth: {
    origin: function(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for auth endpoint'));
      }
    },
    methods: AUTH_METHODS,
    allowedHeaders: AUTH_HEADERS,
    exposedHeaders: ['Set-Cookie'],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
  },

  /**
   * Analytics CORS configuration - specific for analytics endpoints
   */
  analytics: {
    origin: function(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for analytics'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: COMMON_HEADERS,
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
  },

  /**
   * Development CORS configuration - very permissive for local development
   */
  development: {
    origin: '*',
    methods: AUTH_METHODS,
    allowedHeaders: [...AUTH_HEADERS, 'x-cryptique-site-id'],
    credentials: false, // Can't use credentials with wildcard origin
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 200
  }
};

/**
 * Get CORS middleware for a specific configuration
 * @param {string} type - The type of CORS configuration ('standard', 'sdk', 'auth', 'analytics', 'development')
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Function} - Express CORS middleware
 */
function getCorsMiddleware(type = 'standard', customOptions = {}) {
  const config = corsConfigurations[type];
  if (!config) {
    throw new Error(`Unknown CORS configuration type: ${type}`);
  }
  
  // Merge custom options with the base configuration
  const finalConfig = { ...config, ...customOptions };
  
  return cors(finalConfig);
}

/**
 * Manual CORS headers middleware for cases where cors() middleware isn't sufficient
 * @param {string} type - The type of CORS configuration
 * @returns {Function} - Express middleware function
 */
function setCorsHeaders(type = 'standard') {
  return (req, res, next) => {
    const origin = req.headers.origin;
    const config = corsConfigurations[type];
    
    if (!config) {
      return next();
    }
    
    // Handle origin
    if (typeof config.origin === 'function') {
      config.origin(origin, (err, allowed) => {
        if (!err && allowed) {
          res.header('Access-Control-Allow-Origin', allowed === true ? origin : allowed);
        }
      });
    } else if (config.origin === '*') {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (Array.isArray(config.origin) && config.origin.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    // Set other headers
    if (config.methods) {
      res.header('Access-Control-Allow-Methods', config.methods.join(', '));
    }
    
    if (config.allowedHeaders) {
      res.header('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
    }
    
    if (config.exposedHeaders) {
      res.header('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
    }
    
    if (config.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (config.maxAge) {
      res.header('Access-Control-Max-Age', config.maxAge.toString());
    }
    
    next();
  };
}

/**
 * Environment-aware CORS configuration
 * Returns appropriate CORS config based on NODE_ENV
 */
function getEnvironmentCors(type = 'standard', customOptions = {}) {
  if (process.env.NODE_ENV === 'development') {
    return getCorsMiddleware('development', customOptions);
  }
  
  return getCorsMiddleware(type, customOptions);
}

module.exports = {
  // Main functions
  getCorsMiddleware,
  setCorsHeaders,
  getEnvironmentCors,
  
  // Configuration objects
  corsConfigurations,
  
  // Utility functions
  isOriginAllowed,
  
  // Constants
  DEFAULT_ALLOWED_ORIGINS,
  COMMON_HEADERS,
  SDK_HEADERS,
  AUTH_HEADERS,
  STANDARD_METHODS,
  AUTH_METHODS
};