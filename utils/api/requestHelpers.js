/**
 * Request Helper Utilities
 * 
 * Common request processing utilities extracted from existing route handlers
 * to standardize request validation, parameter extraction, and processing.
 */

const { BadRequestError, NotFoundError, AuthorizationError } = require('./errorHandlers');

/**
 * Extract and validate required parameters from request
 * @param {Object} req - Express request object
 * @param {Array} requiredParams - Array of required parameter names
 * @param {string} source - Source of parameters ('body', 'params', 'query', 'headers')
 * @returns {Object} - Extracted parameters
 * @throws {BadRequestError} - If required parameters are missing
 */
const extractRequiredParams = (req, requiredParams, source = 'body') => {
  const sourceData = req[source] || {};
  const extracted = {};
  const missing = [];

  requiredParams.forEach(param => {
    if (sourceData[param] === undefined || sourceData[param] === null || sourceData[param] === '') {
      missing.push(param);
    } else {
      extracted[param] = sourceData[param];
    }
  });

  if (missing.length > 0) {
    throw new BadRequestError(
      `Missing required parameters: ${missing.join(', ')}`,
      { missing, source }
    );
  }

  return extracted;
};

/**
 * Extract optional parameters with default values
 * @param {Object} req - Express request object
 * @param {Object} paramDefaults - Object with parameter names as keys and default values
 * @param {string} source - Source of parameters ('body', 'params', 'query', 'headers')
 * @returns {Object} - Extracted parameters with defaults applied
 */
const extractOptionalParams = (req, paramDefaults, source = 'query') => {
  const sourceData = req[source] || {};
  const extracted = {};

  Object.keys(paramDefaults).forEach(param => {
    extracted[param] = sourceData[param] !== undefined 
      ? sourceData[param] 
      : paramDefaults[param];
  });

  return extracted;
};

/**
 * Extract pagination parameters from query string
 * @param {Object} req - Express request object
 * @param {Object} defaults - Default pagination values
 * @returns {Object} - Pagination parameters
 */
const extractPaginationParams = (req, defaults = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 10,
    maxLimit = 100
  } = defaults;

  const page = Math.max(1, parseInt(req.query.page) || defaultPage);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit) || defaultLimit));
  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    offset: skip // Alias for skip
  };
};

/**
 * Extract sorting parameters from query string
 * @param {Object} req - Express request object
 * @param {Object} options - Sorting options
 * @returns {Object} - Sorting parameters
 */
const extractSortParams = (req, options = {}) => {
  const {
    defaultSort = 'createdAt',
    defaultOrder = 'desc',
    allowedFields = []
  } = options;

  const sortBy = req.query.sortBy || defaultSort;
  const sortOrder = req.query.sortOrder || defaultOrder;

  // Validate sort field if allowedFields is specified
  if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
    throw new BadRequestError(
      `Invalid sort field. Allowed fields: ${allowedFields.join(', ')}`,
      { sortBy, allowedFields }
    );
  }

  // Validate sort order
  if (!['asc', 'desc', '1', '-1'].includes(sortOrder)) {
    throw new BadRequestError(
      'Invalid sort order. Must be "asc", "desc", "1", or "-1"',
      { sortOrder }
    );
  }

  // Convert to MongoDB sort format
  const mongoSort = {};
  mongoSort[sortBy] = sortOrder === 'asc' || sortOrder === '1' ? 1 : -1;

  return {
    sortBy,
    sortOrder,
    mongoSort
  };
};

/**
 * Extract filtering parameters from query string
 * @param {Object} req - Express request object
 * @param {Object} options - Filtering options
 * @returns {Object} - Filter parameters
 */
const extractFilterParams = (req, options = {}) => {
  const {
    allowedFields = [],
    dateFields = [],
    numericFields = [],
    booleanFields = []
  } = options;

  const filters = {};
  const query = req.query;

  Object.keys(query).forEach(key => {
    // Skip pagination and sorting parameters
    if (['page', 'limit', 'sortBy', 'sortOrder'].includes(key)) {
      return;
    }

    // Check if field is allowed
    if (allowedFields.length > 0 && !allowedFields.includes(key)) {
      return;
    }

    const value = query[key];

    // Handle date fields
    if (dateFields.includes(key)) {
      if (key.endsWith('_from') || key.endsWith('_after')) {
        const baseField = key.replace(/_from$|_after$/, '');
        filters[baseField] = filters[baseField] || {};
        filters[baseField].$gte = new Date(value);
      } else if (key.endsWith('_to') || key.endsWith('_before')) {
        const baseField = key.replace(/_to$|_before$/, '');
        filters[baseField] = filters[baseField] || {};
        filters[baseField].$lte = new Date(value);
      } else {
        filters[key] = new Date(value);
      }
      return;
    }

    // Handle numeric fields
    if (numericFields.includes(key)) {
      if (key.endsWith('_min')) {
        const baseField = key.replace(/_min$/, '');
        filters[baseField] = filters[baseField] || {};
        filters[baseField].$gte = parseFloat(value);
      } else if (key.endsWith('_max')) {
        const baseField = key.replace(/_max$/, '');
        filters[baseField] = filters[baseField] || {};
        filters[baseField].$lte = parseFloat(value);
      } else {
        filters[key] = parseFloat(value);
      }
      return;
    }

    // Handle boolean fields
    if (booleanFields.includes(key)) {
      filters[key] = value === 'true' || value === '1';
      return;
    }

    // Handle text search (case-insensitive regex)
    if (typeof value === 'string' && value.length > 0) {
      filters[key] = { $regex: value, $options: 'i' };
    } else {
      filters[key] = value;
    }
  });

  return filters;
};

/**
 * Validate team access for a user
 * @param {Object} req - Express request object (should have userId from auth middleware)
 * @param {string} teamId - Team ID to validate access for
 * @param {Object} Team - Team model
 * @returns {Object} - Team object if access is valid
 * @throws {BadRequestError|NotFoundError|AuthorizationError}
 */
const validateTeamAccess = async (req, teamId, Team) => {
  if (!teamId) {
    throw new BadRequestError('Team ID is required');
  }

  if (!req.userId) {
    throw new AuthorizationError('User authentication required');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new NotFoundError('Team', 'Team not found');
  }

  // Check if user is a member of the team
  const isMember = team.members.some(member => 
    member.user.toString() === req.userId.toString()
  );

  if (!isMember) {
    throw new AuthorizationError('Not authorized to access this team');
  }

  return team;
};

/**
 * Validate resource ownership
 * @param {Object} resource - Resource object
 * @param {string} userId - User ID
 * @param {string} ownerField - Field name that contains the owner ID (default: 'user')
 * @throws {AuthorizationError}
 */
const validateResourceOwnership = (resource, userId, ownerField = 'user') => {
  if (!resource) {
    throw new NotFoundError('Resource');
  }

  const resourceOwnerId = resource[ownerField]?.toString() || resource[ownerField];
  
  if (resourceOwnerId !== userId.toString()) {
    throw new AuthorizationError('Not authorized to access this resource');
  }
};

/**
 * Extract and validate site ID from request
 * @param {Object} req - Express request object
 * @param {string} paramName - Parameter name (default: 'siteId')
 * @returns {string} - Site ID
 * @throws {BadRequestError}
 */
const extractSiteId = (req, paramName = 'siteId') => {
  const siteId = req.params[paramName] || req.query[paramName] || req.body[paramName];
  
  if (!siteId) {
    throw new BadRequestError(`${paramName} is required`);
  }

  return siteId;
};

/**
 * Extract and validate user ID from authenticated request
 * @param {Object} req - Express request object (should have userId from auth middleware)
 * @returns {string} - User ID
 * @throws {AuthorizationError}
 */
const extractUserId = (req) => {
  if (!req.userId) {
    throw new AuthorizationError('User authentication required');
  }

  return req.userId;
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @param {string} fieldName - Field name for error messages
 * @throws {BadRequestError}
 */
const validateUrl = (url, fieldName = 'URL') => {
  if (!url) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  try {
    new URL(url);
  } catch (error) {
    throw new BadRequestError(
      `Invalid ${fieldName} format. URLs must be properly encoded.`,
      { url, error: error.message }
    );
  }
};

/**
 * Validate array parameter
 * @param {any} value - Value to validate
 * @param {string} fieldName - Field name for error messages
 * @param {Object} options - Validation options
 * @returns {Array} - Validated array
 * @throws {BadRequestError}
 */
const validateArray = (value, fieldName, options = {}) => {
  const { minLength = 0, maxLength = Infinity, required = true } = options;

  if (!value && required) {
    throw new BadRequestError(`${fieldName} is required`);
  }

  if (!value && !required) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new BadRequestError(
      `${fieldName} must be an array`,
      { value, type: typeof value }
    );
  }

  if (value.length < minLength) {
    throw new BadRequestError(
      `${fieldName} must contain at least ${minLength} items`,
      { length: value.length, minLength }
    );
  }

  if (value.length > maxLength) {
    throw new BadRequestError(
      `${fieldName} must contain at most ${maxLength} items`,
      { length: value.length, maxLength }
    );
  }

  return value;
};

/**
 * Create a request context object with common request information
 * @param {Object} req - Express request object
 * @returns {Object} - Request context
 */
const createRequestContext = (req) => {
  return {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId,
    timestamp: new Date().toISOString(),
    requestId: req.id || req.headers['x-request-id']
  };
};

module.exports = {
  // Parameter extraction
  extractRequiredParams,
  extractOptionalParams,
  extractPaginationParams,
  extractSortParams,
  extractFilterParams,
  
  // Specific extractors
  extractSiteId,
  extractUserId,
  
  // Validation helpers
  validateTeamAccess,
  validateResourceOwnership,
  validateUrl,
  validateArray,
  
  // Context helpers
  createRequestContext
};