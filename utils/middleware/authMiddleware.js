/**
 * Centralized Authentication Middleware
 * 
 * This module provides standardized authentication middleware for different types of routes
 * and services across the application. It consolidates all authentication logic into a single
 * location for easier maintenance and consistency.
 */

const jwt = require('jsonwebtoken');
const { 
  extractAndValidateToken, 
  verifyJwtToken, 
  validateApiKey,
  validateTeamMembership,
  validateResourceOwnership,
  validateSubscriptionAccess
} = require('../validation/authValidators');
const { 
  AuthenticationError, 
  AuthorizationError, 
  BadRequestError 
} = require('../api/errorHandlers');

/**
 * Default JWT configuration
 */
const DEFAULT_JWT_CONFIG = {
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
  clockTolerance: 30 // 30 seconds
};

/**
 * Authentication middleware configurations for different route types
 */
const authConfigurations = {
  /**
   * Standard JWT authentication - required by default
   */
  standard: {
    required: true,
    attachUser: false,
    jwtConfig: DEFAULT_JWT_CONFIG,
    errorMessages: {
      noToken: 'Authentication required',
      invalidToken: 'Invalid or expired token',
      tokenExpired: 'Token has expired'
    }
  },

  /**
   * Optional JWT authentication - allows unauthenticated access
   */
  optional: {
    required: false,
    attachUser: false,
    jwtConfig: DEFAULT_JWT_CONFIG,
    errorMessages: {
      invalidToken: 'Invalid or expired token',
      tokenExpired: 'Token has expired'
    }
  },

  /**
   * Strict authentication with user object attachment
   */
  strict: {
    required: true,
    attachUser: true,
    jwtConfig: DEFAULT_JWT_CONFIG,
    errorMessages: {
      noToken: 'Authentication required',
      invalidToken: 'Invalid or expired token',
      tokenExpired: 'Token has expired',
      userNotFound: 'User not found'
    }
  },

  /**
   * API key authentication for service-to-service communication
   */
  apiKey: {
    headerName: 'x-api-key',
    envVarName: 'API_KEY',
    required: true,
    errorMessages: {
      noApiKey: 'API key required',
      invalidApiKey: 'Invalid API key'
    }
  },

  /**
   * SDK authentication - uses site ID for identification
   */
  sdk: {
    headerName: 'x-cryptique-site-id',
    required: true,
    validateSiteId: true,
    errorMessages: {
      noSiteId: 'Site ID required',
      invalidSiteId: 'Invalid site ID'
    }
  },

  /**
   * Admin authentication - requires admin role
   */
  admin: {
    required: true,
    attachUser: true,
    requireRole: 'admin',
    jwtConfig: DEFAULT_JWT_CONFIG,
    errorMessages: {
      noToken: 'Admin authentication required',
      invalidToken: 'Invalid or expired admin token',
      insufficientRole: 'Admin access required'
    }
  }
};

/**
 * Create JWT authentication middleware
 * @param {string} type - Authentication configuration type
 * @param {Object} customOptions - Custom options to override defaults
 * @param {Object} userModel - User model for user attachment (optional)
 * @returns {Function} - Express authentication middleware
 */
function createJwtAuthMiddleware(type = 'standard', customOptions = {}, userModel = null) {
  const config = authConfigurations[type];
  if (!config) {
    throw new Error(`Unknown authentication configuration type: ${type}`);
  }

  const options = { ...config, ...customOptions };

  return async (req, res, next) => {
    try {
      // Extract and validate token
      const tokenResult = extractAndValidateToken(req, { 
        required: options.required 
      });

      if (!tokenResult.isValid) {
        if (!options.required) {
          return next();
        }
        throw new AuthenticationError(
          options.errorMessages.noToken || tokenResult.error
        );
      }

      // If no token and not required, continue
      if (!tokenResult.token) {
        return next();
      }

      // Verify JWT token
      const verifyResult = verifyJwtToken(tokenResult.token, options.jwtConfig);

      if (!verifyResult.isValid) {
        let errorMessage = options.errorMessages.invalidToken;
        
        if (verifyResult.code === 'TOKEN_EXPIRED') {
          errorMessage = options.errorMessages.tokenExpired || errorMessage;
        }
        
        throw new AuthenticationError(errorMessage || verifyResult.error);
      }

      // Attach user information to request
      req.userId = verifyResult.payload.userId || verifyResult.payload.sub;
      req.userEmail = verifyResult.payload.email;
      req.tokenPayload = verifyResult.payload;

      // Attach full user object if requested
      if (options.attachUser && userModel && req.userId) {
        try {
          const user = await userModel.findById(req.userId);
          if (!user) {
            throw new AuthenticationError(
              options.errorMessages.userNotFound || 'User not found'
            );
          }
          req.user = user;

          // Check role requirement
          if (options.requireRole && user.role !== options.requireRole) {
            throw new AuthorizationError(
              options.errorMessages.insufficientRole || 
              `${options.requireRole} role required`
            );
          }
        } catch (error) {
          if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
            throw error;
          }
          console.error('Failed to attach user object:', error.message);
          throw new AuthenticationError('Failed to authenticate user');
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create API key authentication middleware
 * @param {string} type - Authentication configuration type
 * @param {Object} customOptions - Custom options to override defaults
 * @returns {Function} - Express API key authentication middleware
 */
function createApiKeyAuthMiddleware(type = 'apiKey', customOptions = {}) {
  const config = authConfigurations[type];
  if (!config) {
    throw new Error(`Unknown authentication configuration type: ${type}`);
  }

  const options = { ...config, ...customOptions };

  return (req, res, next) => {
    try {
      const validationResult = validateApiKey(req, {
        headerName: options.headerName,
        envVarName: options.envVarName,
        required: options.required
      });

      if (!validationResult.isValid) {
        if (!options.required && validationResult.code === 'API_KEY_REQUIRED') {
          return next();
        }

        const errorMessage = validationResult.code === 'API_KEY_REQUIRED' 
          ? options.errorMessages.noApiKey
          : options.errorMessages.invalidApiKey;

        throw new AuthenticationError(errorMessage || validationResult.error);
      }

      // Attach API key info to request
      req.apiKey = validationResult.apiKey;
      req.authenticated = true;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create SDK authentication middleware
 * @param {Object} customOptions - Custom options to override defaults
 * @param {Object} siteModel - Site model for site validation (optional)
 * @returns {Function} - Express SDK authentication middleware
 */
function createSdkAuthMiddleware(customOptions = {}, siteModel = null) {
  const config = authConfigurations.sdk;
  const options = { ...config, ...customOptions };

  return async (req, res, next) => {
    try {
      const siteId = req.headers[options.headerName];

      if (!siteId) {
        if (!options.required) {
          return next();
        }
        throw new AuthenticationError(
          options.errorMessages.noSiteId || 'Site ID required'
        );
      }

      // Validate site ID format
      if (typeof siteId !== 'string' || siteId.trim() === '') {
        throw new AuthenticationError(
          options.errorMessages.invalidSiteId || 'Invalid site ID format'
        );
      }

      // Attach site ID to request
      req.siteId = siteId.trim();

      // Optionally validate site exists
      if (options.validateSiteId && siteModel) {
        try {
          const site = await siteModel.findOne({ siteId: req.siteId });
          if (!site) {
            throw new AuthenticationError(
              options.errorMessages.invalidSiteId || 'Site not found'
            );
          }
          req.site = site;
        } catch (error) {
          if (error instanceof AuthenticationError) {
            throw error;
          }
          console.error('Failed to validate site:', error.message);
          throw new AuthenticationError('Failed to validate site');
        }
      }

      req.authenticated = true;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create team access middleware
 * @param {Object} teamModel - Team model
 * @param {Object} options - Middleware options
 * @returns {Function} - Express team access middleware
 */
function createTeamAccessMiddleware(teamModel, options = {}) {
  const {
    teamIdSource = 'params',
    teamIdField = 'teamId',
    requireRole = null,
    requirePermissions = [],
    errorMessages = {}
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.userId) {
        throw new AuthenticationError('Authentication required for team access');
      }

      const teamId = req[teamIdSource][teamIdField];

      if (!teamId) {
        throw new BadRequestError(
          errorMessages.noTeamId || `${teamIdField} is required`
        );
      }

      const validationResult = await validateTeamMembership(
        req.userId,
        teamId,
        teamModel,
        { requireRole, requirePermissions }
      );

      if (!validationResult.isValid) {
        if (validationResult.code === 'TEAM_NOT_FOUND') {
          throw new BadRequestError(validationResult.error);
        }
        
        const errorMessage = errorMessages[validationResult.code] || validationResult.error;
        throw new AuthorizationError(errorMessage);
      }

      // Attach team information to request
      req.team = validationResult.team;
      req.teamMember = validationResult.member;
      req.teamRole = validationResult.member.role;
      req.teamPermissions = validationResult.member.permissions || [];

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create resource ownership middleware
 * @param {Function} resourceFetcher - Function to fetch resource by ID
 * @param {Object} options - Middleware options
 * @returns {Function} - Express resource ownership middleware
 */
function createResourceOwnershipMiddleware(resourceFetcher, options = {}) {
  const {
    resourceIdSource = 'params',
    resourceIdField = 'id',
    ownerField = 'user',
    allowTeamAccess = false,
    teamField = 'team',
    errorMessages = {}
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.userId) {
        throw new AuthenticationError('Authentication required for resource access');
      }

      const resourceId = req[resourceIdSource][resourceIdField];

      if (!resourceId) {
        throw new BadRequestError(
          errorMessages.noResourceId || `${resourceIdField} is required`
        );
      }

      // Fetch resource
      let resource;
      try {
        resource = await resourceFetcher(resourceId);
      } catch (error) {
        console.error('Failed to fetch resource:', error.message);
        throw new BadRequestError('Failed to fetch resource');
      }

      if (!resource) {
        throw new BadRequestError(
          errorMessages.resourceNotFound || 'Resource not found'
        );
      }

      // Validate ownership
      const validationResult = validateResourceOwnership(
        req.userId,
        resource,
        { ownerField, allowTeamAccess, teamField }
      );

      if (!validationResult.isValid) {
        if (validationResult.code === 'TEAM_ACCESS_REQUIRED' && req.team) {
          // If team access is required and we have team info, check team membership
          const teamId = validationResult.teamId;
          if (req.team._id.toString() === teamId.toString()) {
            req.resource = resource;
            req.accessType = 'team';
            return next();
          }
        }

        throw new AuthorizationError(
          errorMessages.accessDenied || validationResult.error
        );
      }

      // Attach resource to request
      req.resource = resource;
      req.accessType = validationResult.accessType;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create subscription access middleware
 * @param {string} feature - Feature to check access for
 * @param {Object} options - Middleware options
 * @returns {Function} - Express subscription access middleware
 */
function createSubscriptionAccessMiddleware(feature, options = {}) {
  const {
    allowGracePeriod = false,
    gracePeriodDays = 7,
    errorMessages = {}
  } = options;

  return (req, res, next) => {
    try {
      if (!req.team) {
        throw new AuthenticationError('Team authentication required for subscription access');
      }

      const validationResult = validateSubscriptionAccess(
        req.team,
        feature,
        { allowGracePeriod, gracePeriodDays }
      );

      if (!validationResult.isValid) {
        const errorMessage = errorMessages[validationResult.code] || validationResult.error;
        throw new AuthorizationError(errorMessage);
      }

      // Attach subscription info to request
      req.subscriptionPlan = validationResult.plan;
      req.subscriptionStatus = validationResult.status;

      if (validationResult.gracePeriodEnd) {
        req.gracePeriodEnd = validationResult.gracePeriodEnd;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Get authentication middleware for a specific configuration
 * @param {string} type - The type of authentication configuration
 * @param {Object} customOptions - Custom options to override defaults
 * @param {Object} userModel - User model for user attachment (optional)
 * @returns {Function} - Express authentication middleware
 */
function getAuthMiddleware(type = 'standard', customOptions = {}, userModel = null) {
  if (type === 'apiKey' || type === 'sdk') {
    if (type === 'apiKey') {
      return createApiKeyAuthMiddleware(type, customOptions);
    } else {
      return createSdkAuthMiddleware(customOptions, userModel);
    }
  }

  return createJwtAuthMiddleware(type, customOptions, userModel);
}

/**
 * Create multiple authentication middleware for different tiers
 * @param {Object} userModel - User model for user attachment
 * @param {Object} options - Configuration options
 * @returns {Object} - Object containing different authentication middleware
 */
function createAuthMiddlewares(userModel = null, options = {}) {
  return {
    standard: getAuthMiddleware('standard', {}, userModel),
    optional: getAuthMiddleware('optional', {}, userModel),
    strict: getAuthMiddleware('strict', {}, userModel),
    admin: getAuthMiddleware('admin', {}, userModel),
    apiKey: getAuthMiddleware('apiKey'),
    sdk: getAuthMiddleware('sdk', {}, userModel),
    
    // Specialized middleware
    teamAccess: (teamModel, middlewareOptions = {}) => 
      createTeamAccessMiddleware(teamModel, middlewareOptions),
    resourceOwnership: (resourceFetcher, middlewareOptions = {}) => 
      createResourceOwnershipMiddleware(resourceFetcher, middlewareOptions),
    subscriptionAccess: (feature, middlewareOptions = {}) => 
      createSubscriptionAccessMiddleware(feature, middlewareOptions)
  };
}

module.exports = {
  // Main functions
  getAuthMiddleware,
  createAuthMiddlewares,
  
  // Specific middleware creators
  createJwtAuthMiddleware,
  createApiKeyAuthMiddleware,
  createSdkAuthMiddleware,
  createTeamAccessMiddleware,
  createResourceOwnershipMiddleware,
  createSubscriptionAccessMiddleware,
  
  // Configuration objects
  authConfigurations,
  DEFAULT_JWT_CONFIG
};