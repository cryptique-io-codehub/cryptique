/**
 * Authentication and Authorization Validation Utilities
 * 
 * Common authentication and authorization validation patterns extracted
 * from middleware and controllers to provide consistent auth validation.
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError, AuthorizationError, BadRequestError } = require('../api/errorHandlers');

/**
 * Extract and validate JWT token from request headers
 * @param {Object} req - Express request object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result with token
 */
const extractAndValidateToken = (req, options = {}) => {
  const { 
    headerName = 'authorization',
    tokenType = 'Bearer',
    required = true
  } = options;

  const authHeader = req.headers[headerName];

  if (!authHeader) {
    if (!required) {
      return { isValid: true, token: null };
    }
    return {
      isValid: false,
      error: 'No authorization header provided',
      code: 'AUTH_HEADER_MISSING'
    };
  }

  if (typeof authHeader !== 'string') {
    return {
      isValid: false,
      error: 'Authorization header must be a string',
      code: 'AUTH_HEADER_INVALID_TYPE'
    };
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return {
      isValid: false,
      error: `Authorization header format should be "${tokenType} <token>"`,
      code: 'AUTH_HEADER_INVALID_FORMAT'
    };
  }

  const [type, token] = parts;

  if (type !== tokenType) {
    return {
      isValid: false,
      error: `Authorization type should be "${tokenType}"`,
      code: 'AUTH_TYPE_INVALID'
    };
  }

  if (!token || token.trim() === '') {
    return {
      isValid: false,
      error: 'Token is empty',
      code: 'TOKEN_EMPTY'
    };
  }

  return {
    isValid: true,
    token: token.trim()
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @returns {Object} - Verification result with decoded payload
 */
const verifyJwtToken = (token, options = {}) => {
  const {
    secret = process.env.JWT_SECRET,
    algorithms = ['HS256'],
    issuer = null,
    audience = null,
    clockTolerance = 0
  } = options;

  if (!secret) {
    throw new Error('JWT secret is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms,
      issuer,
      audience,
      clockTolerance
    });

    return {
      isValid: true,
      payload: decoded
    };
  } catch (error) {
    let errorCode = 'TOKEN_INVALID';
    let errorMessage = 'Invalid token';

    if (error.name === 'TokenExpiredError') {
      errorCode = 'TOKEN_EXPIRED';
      errorMessage = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      errorCode = 'TOKEN_MALFORMED';
      errorMessage = 'Token is malformed';
    } else if (error.name === 'NotBeforeError') {
      errorCode = 'TOKEN_NOT_ACTIVE';
      errorMessage = 'Token is not active yet';
    }

    return {
      isValid: false,
      error: errorMessage,
      code: errorCode,
      details: error.message
    };
  }
};

/**
 * Validate refresh token
 * @param {string} token - Refresh token to validate
 * @param {Object} RefreshTokenModel - Refresh token model
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
const validateRefreshToken = async (token, RefreshTokenModel, options = {}) => {
  const { checkExpiry = true } = options;

  if (!token || typeof token !== 'string') {
    return {
      isValid: false,
      error: 'Refresh token is required',
      code: 'REFRESH_TOKEN_REQUIRED'
    };
  }

  try {
    const query = {
      token: token.trim(),
      isValid: true
    };

    if (checkExpiry) {
      query.expiresAt = { $gt: new Date() };
    }

    const tokenDoc = await RefreshTokenModel.findOne(query);

    if (!tokenDoc) {
      return {
        isValid: false,
        error: 'Invalid or expired refresh token',
        code: 'REFRESH_TOKEN_INVALID'
      };
    }

    return {
      isValid: true,
      tokenDoc
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate refresh token',
      code: 'REFRESH_TOKEN_VALIDATION_ERROR',
      details: error.message
    };
  }
};

/**
 * Validate API key
 * @param {Object} req - Express request object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateApiKey = (req, options = {}) => {
  const {
    headerName = 'x-api-key',
    envVarName = 'API_KEY',
    required = true
  } = options;

  const apiKey = req.headers[headerName];

  if (!apiKey) {
    if (!required) {
      return { isValid: true, apiKey: null };
    }
    return {
      isValid: false,
      error: 'API key is required',
      code: 'API_KEY_REQUIRED'
    };
  }

  const validApiKey = process.env[envVarName];

  if (!validApiKey) {
    throw new Error(`API key environment variable ${envVarName} is not configured`);
  }

  if (apiKey !== validApiKey) {
    return {
      isValid: false,
      error: 'Invalid API key',
      code: 'API_KEY_INVALID'
    };
  }

  return {
    isValid: true,
    apiKey
  };
};

/**
 * Validate team membership
 * @param {string} userId - User ID
 * @param {string} teamId - Team ID
 * @param {Object} TeamModel - Team model
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} - Validation result
 */
const validateTeamMembership = async (userId, teamId, TeamModel, options = {}) => {
  const { requireRole = null, requirePermissions = [] } = options;

  if (!userId) {
    return {
      isValid: false,
      error: 'User ID is required',
      code: 'USER_ID_REQUIRED'
    };
  }

  if (!teamId) {
    return {
      isValid: false,
      error: 'Team ID is required',
      code: 'TEAM_ID_REQUIRED'
    };
  }

  try {
    const team = await TeamModel.findById(teamId);

    if (!team) {
      return {
        isValid: false,
        error: 'Team not found',
        code: 'TEAM_NOT_FOUND'
      };
    }

    const member = team.members.find(m => 
      m.user.toString() === userId.toString()
    );

    if (!member) {
      return {
        isValid: false,
        error: 'User is not a member of this team',
        code: 'NOT_TEAM_MEMBER'
      };
    }

    // Check role requirement
    if (requireRole && member.role !== requireRole) {
      return {
        isValid: false,
        error: `User must have ${requireRole} role`,
        code: 'INSUFFICIENT_ROLE'
      };
    }

    // Check permission requirements
    if (requirePermissions.length > 0) {
      const hasAllPermissions = requirePermissions.every(permission =>
        member.permissions && member.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return {
          isValid: false,
          error: 'User lacks required permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: { required: requirePermissions, actual: member.permissions || [] }
        };
      }
    }

    return {
      isValid: true,
      team,
      member
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate team membership',
      code: 'TEAM_VALIDATION_ERROR',
      details: error.message
    };
  }
};

/**
 * Validate resource ownership
 * @param {string} userId - User ID
 * @param {Object} resource - Resource object
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateResourceOwnership = (userId, resource, options = {}) => {
  const { 
    ownerField = 'user',
    allowTeamAccess = false,
    teamField = 'team'
  } = options;

  if (!userId) {
    return {
      isValid: false,
      error: 'User ID is required',
      code: 'USER_ID_REQUIRED'
    };
  }

  if (!resource) {
    return {
      isValid: false,
      error: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND'
    };
  }

  const resourceOwnerId = resource[ownerField]?.toString() || resource[ownerField];

  // Check direct ownership
  if (resourceOwnerId === userId.toString()) {
    return {
      isValid: true,
      accessType: 'owner'
    };
  }

  // Check team access if allowed
  if (allowTeamAccess && resource[teamField]) {
    // This would need additional team membership validation
    // For now, we'll return a partial result that requires further validation
    return {
      isValid: false,
      error: 'Team access validation required',
      code: 'TEAM_ACCESS_REQUIRED',
      teamId: resource[teamField]
    };
  }

  return {
    isValid: false,
    error: 'User does not have access to this resource',
    code: 'ACCESS_DENIED'
  };
};

/**
 * Validate subscription access
 * @param {Object} team - Team object
 * @param {string} feature - Feature to check access for
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result
 */
const validateSubscriptionAccess = (team, feature, options = {}) => {
  const { 
    allowGracePeriod = false,
    gracePeriodDays = 7
  } = options;

  if (!team) {
    return {
      isValid: false,
      error: 'Team is required',
      code: 'TEAM_REQUIRED'
    };
  }

  const subscription = team.subscription;

  if (!subscription) {
    return {
      isValid: false,
      error: 'No subscription found',
      code: 'NO_SUBSCRIPTION'
    };
  }

  // Define feature access by plan
  const planFeatures = {
    free: ['basic_analytics', 'basic_tracking'],
    pro: ['basic_analytics', 'basic_tracking', 'advanced_analytics', 'smart_contracts'],
    enterprise: ['basic_analytics', 'basic_tracking', 'advanced_analytics', 'smart_contracts', 'custom_reports', 'api_access']
  };

  const plan = subscription.plan || 'free';
  const allowedFeatures = planFeatures[plan] || [];

  if (!allowedFeatures.includes(feature)) {
    return {
      isValid: false,
      error: `Feature '${feature}' is not available on the ${plan} plan`,
      code: 'FEATURE_NOT_AVAILABLE',
      details: { plan, feature, allowedFeatures }
    };
  }

  // Check subscription status
  const status = subscription.status;
  const now = new Date();

  if (status === 'active') {
    return {
      isValid: true,
      plan,
      status
    };
  }

  if (status === 'canceled' && allowGracePeriod) {
    const canceledAt = new Date(subscription.canceledAt);
    const gracePeriodEnd = new Date(canceledAt.getTime() + (gracePeriodDays * 24 * 60 * 60 * 1000));

    if (now <= gracePeriodEnd) {
      return {
        isValid: true,
        plan,
        status: 'grace_period',
        gracePeriodEnd
      };
    }
  }

  return {
    isValid: false,
    error: 'Subscription is not active',
    code: 'SUBSCRIPTION_INACTIVE',
    details: { status, plan }
  };
};

/**
 * Create authentication middleware
 * @param {Object} options - Middleware options
 * @returns {Function} - Express middleware function
 */
const createAuthMiddleware = (options = {}) => {
  const {
    required = true,
    attachUser = true,
    userModel = null
  } = options;

  return async (req, res, next) => {
    try {
      // Extract token
      const tokenResult = extractAndValidateToken(req, { required });
      
      if (!tokenResult.isValid) {
        if (!required) {
          return next();
        }
        throw new AuthenticationError(tokenResult.error);
      }

      if (!tokenResult.token) {
        return next();
      }

      // Verify token
      const verifyResult = verifyJwtToken(tokenResult.token);
      
      if (!verifyResult.isValid) {
        throw new AuthenticationError(verifyResult.error);
      }

      // Attach user info to request
      req.userId = verifyResult.payload.userId || verifyResult.payload.sub;
      req.tokenPayload = verifyResult.payload;

      // Optionally attach full user object
      if (attachUser && userModel && req.userId) {
        try {
          const user = await userModel.findById(req.userId);
          req.user = user;
        } catch (error) {
          console.warn('Failed to attach user object:', error.message);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Create team access middleware
 * @param {Object} TeamModel - Team model
 * @param {Object} options - Middleware options
 * @returns {Function} - Express middleware function
 */
const createTeamAccessMiddleware = (TeamModel, options = {}) => {
  const {
    teamIdSource = 'params', // 'params', 'body', 'query'
    teamIdField = 'teamId',
    requireRole = null,
    requirePermissions = []
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.userId) {
        throw new AuthenticationError('Authentication required');
      }

      const teamId = req[teamIdSource][teamIdField];
      
      if (!teamId) {
        throw new BadRequestError(`${teamIdField} is required`);
      }

      const validationResult = await validateTeamMembership(
        req.userId,
        teamId,
        TeamModel,
        { requireRole, requirePermissions }
      );

      if (!validationResult.isValid) {
        if (validationResult.code === 'TEAM_NOT_FOUND') {
          throw new BadRequestError(validationResult.error);
        }
        throw new AuthorizationError(validationResult.error);
      }

      // Attach team and member info to request
      req.team = validationResult.team;
      req.teamMember = validationResult.member;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  // Token validation
  extractAndValidateToken,
  verifyJwtToken,
  validateRefreshToken,
  validateApiKey,
  
  // Access validation
  validateTeamMembership,
  validateResourceOwnership,
  validateSubscriptionAccess,
  
  // Middleware creators
  createAuthMiddleware,
  createTeamAccessMiddleware
};