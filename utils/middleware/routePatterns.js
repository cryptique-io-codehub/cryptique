/**
 * Common route patterns and handlers
 * Provides pre-built route handlers for common operations
 */

const { asyncHandler, sendErrorResponse, sendSuccessResponse, dbOperation, handlePagination } = require('./routeHelpers');

/**
 * CRUD operation patterns
 */

/**
 * Generic GET by ID pattern
 * Creates a route handler for fetching a single resource by ID
 */
const createGetByIdHandler = (Model, options = {}) => {
  const {
    populate = null,
    select = null,
    transform = null,
    notFoundMessage = 'Resource not found'
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const query = Model.findById(id);
    
    if (populate) {
      query.populate(populate);
    }
    
    if (select) {
      query.select(select);
    }
    
    const resource = await dbOperation(
      () => query.exec(),
      `Failed to fetch resource with ID: ${id}`
    );
    
    if (!resource) {
      return sendErrorResponse(res, 404, notFoundMessage);
    }
    
    const responseData = transform ? transform(resource) : resource;
    
    return sendSuccessResponse(res, { data: responseData });
  });
};

/**
 * Generic GET list pattern with pagination
 * Creates a route handler for fetching a list of resources
 */
const createGetListHandler = (Model, options = {}) => {
  const {
    populate = null,
    select = null,
    defaultSort = { createdAt: -1 },
    filterFn = null,
    transform = null
  } = options;
  
  return asyncHandler(async (req, res) => {
    const pagination = handlePagination(req);
    
    // Build base query
    let filter = {};
    if (filterFn) {
      filter = filterFn(req);
    }
    
    const query = Model.find(filter)
      .sort(defaultSort)
      .skip(pagination.skip)
      .limit(pagination.limit);
    
    if (populate) {
      query.populate(populate);
    }
    
    if (select) {
      query.select(select);
    }
    
    // Execute query and count
    const [resources, total] = await Promise.all([
      dbOperation(() => query.exec(), 'Failed to fetch resources'),
      dbOperation(() => Model.countDocuments(filter), 'Failed to count resources')
    ]);
    
    const responseData = transform ? resources.map(transform) : resources;
    const paginatedResponse = pagination.createResponse(responseData, total);
    
    return sendSuccessResponse(res, paginatedResponse);
  });
};

/**
 * Generic POST create pattern
 * Creates a route handler for creating a new resource
 */
const createPostHandler = (Model, options = {}) => {
  const {
    transform = null,
    beforeSave = null,
    afterSave = null,
    successMessage = 'Resource created successfully'
  } = options;
  
  return asyncHandler(async (req, res) => {
    let data = req.body;
    
    // Apply pre-save transformation
    if (beforeSave) {
      data = await beforeSave(data, req);
    }
    
    const resource = await dbOperation(
      async () => {
        const newResource = new Model(data);
        return await newResource.save();
      },
      'Failed to create resource'
    );
    
    // Apply post-save operations
    if (afterSave) {
      await afterSave(resource, req);
    }
    
    const responseData = transform ? transform(resource) : resource;
    
    return sendSuccessResponse(res, { data: responseData }, successMessage, 201);
  });
};

/**
 * Generic PUT/PATCH update pattern
 * Creates a route handler for updating a resource
 */
const createUpdateHandler = (Model, options = {}) => {
  const {
    transform = null,
    beforeUpdate = null,
    afterUpdate = null,
    successMessage = 'Resource updated successfully',
    notFoundMessage = 'Resource not found'
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { id } = req.params;
    let data = req.body;
    
    // Apply pre-update transformation
    if (beforeUpdate) {
      data = await beforeUpdate(data, req);
    }
    
    const resource = await dbOperation(
      () => Model.findByIdAndUpdate(id, data, { new: true, runValidators: true }),
      `Failed to update resource with ID: ${id}`
    );
    
    if (!resource) {
      return sendErrorResponse(res, 404, notFoundMessage);
    }
    
    // Apply post-update operations
    if (afterUpdate) {
      await afterUpdate(resource, req);
    }
    
    const responseData = transform ? transform(resource) : resource;
    
    return sendSuccessResponse(res, { data: responseData }, successMessage);
  });
};

/**
 * Generic DELETE pattern
 * Creates a route handler for deleting a resource
 */
const createDeleteHandler = (Model, options = {}) => {
  const {
    beforeDelete = null,
    afterDelete = null,
    successMessage = 'Resource deleted successfully',
    notFoundMessage = 'Resource not found'
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const resource = await dbOperation(
      () => Model.findById(id),
      `Failed to find resource with ID: ${id}`
    );
    
    if (!resource) {
      return sendErrorResponse(res, 404, notFoundMessage);
    }
    
    // Apply pre-delete operations
    if (beforeDelete) {
      await beforeDelete(resource, req);
    }
    
    await dbOperation(
      () => Model.findByIdAndDelete(id),
      `Failed to delete resource with ID: ${id}`
    );
    
    // Apply post-delete operations
    if (afterDelete) {
      await afterDelete(resource, req);
    }
    
    return sendSuccessResponse(res, { id }, successMessage);
  });
};

/**
 * Authentication patterns
 */

/**
 * Login pattern
 * Creates a standardized login route handler
 */
const createLoginHandler = (options = {}) => {
  const {
    UserModel,
    validateCredentials,
    generateTokens,
    successMessage = 'Login successful'
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    // Find user
    const user = await dbOperation(
      () => UserModel.findOne({ email }),
      'Failed to find user'
    );
    
    if (!user) {
      res.set('X-Login-Failed', 'true');
      return sendErrorResponse(res, 404, 'User not found');
    }
    
    // Validate credentials
    const isValid = await validateCredentials(user, password);
    if (!isValid) {
      res.set('X-Login-Failed', 'true');
      return sendErrorResponse(res, 401, 'Invalid credentials');
    }
    
    // Generate tokens
    const tokens = await generateTokens(user, req);
    
    // Set refresh token cookie if provided
    if (tokens.refreshToken) {
      res.cookie('refreshToken', tokens.refreshToken.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: tokens.refreshToken.maxAge,
        sameSite: 'strict'
      });
    }
    
    return sendSuccessResponse(res, {
      user,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn
    }, successMessage);
  });
};

/**
 * Team management patterns
 */

/**
 * Team member management pattern
 * Creates handlers for adding/removing team members
 */
const createTeamMemberHandler = (action, options = {}) => {
  const {
    TeamModel,
    UserModel,
    checkPermissions,
    validateLimits = null
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { email, teamName, role } = req.body;
    
    // Find team and user
    const [team, user] = await Promise.all([
      dbOperation(() => TeamModel.findOne({ name: teamName }), 'Failed to find team'),
      dbOperation(() => UserModel.findOne({ email }), 'Failed to find user')
    ]);
    
    if (!team) {
      return sendErrorResponse(res, 404, 'Team not found');
    }
    
    if (!user) {
      return sendErrorResponse(res, 404, 'User not found');
    }
    
    // Check permissions
    const hasPermission = await checkPermissions(team, req.userId);
    if (!hasPermission) {
      return sendErrorResponse(res, 403, 'Insufficient permissions');
    }
    
    if (action === 'add') {
      // Check if user already exists in team
      const existingMember = team.user.find(member => 
        member.userId.toString() === user._id.toString()
      );
      
      if (existingMember) {
        return sendErrorResponse(res, 400, 'User is already a team member');
      }
      
      // Validate limits if provided
      if (validateLimits) {
        const limitCheck = await validateLimits(team);
        if (!limitCheck.valid) {
          return sendErrorResponse(res, 403, limitCheck.message);
        }
      }
      
      // Add member
      await dbOperation(
        () => TeamModel.findByIdAndUpdate(
          team._id,
          { $push: { user: { userId: user._id, role } } },
          { new: true }
        ),
        'Failed to add team member'
      );
      
      // Update user's teams
      await dbOperation(
        () => UserModel.findByIdAndUpdate(
          user._id,
          { $addToSet: { team: team._id } }
        ),
        'Failed to update user teams'
      );
      
      return sendSuccessResponse(res, {}, 'Member added successfully');
      
    } else if (action === 'remove') {
      // Find member index
      const memberIndex = team.user.findIndex(member => 
        member.userId.toString() === user._id.toString()
      );
      
      if (memberIndex === -1) {
        return sendErrorResponse(res, 404, 'User is not a team member');
      }
      
      // Cannot remove team owner (first member)
      if (memberIndex === 0) {
        return sendErrorResponse(res, 403, 'Cannot remove team owner');
      }
      
      // Remove member
      team.user.splice(memberIndex, 1);
      await dbOperation(() => team.save(), 'Failed to remove team member');
      
      // Update user's teams
      await dbOperation(
        () => UserModel.findByIdAndUpdate(
          user._id,
          { $pull: { team: team._id } }
        ),
        'Failed to update user teams'
      );
      
      return sendSuccessResponse(res, {}, 'Member removed successfully');
    }
  });
};

/**
 * Analytics patterns
 */

/**
 * Analytics data handler pattern
 * Creates handlers for analytics endpoints with caching
 */
const createAnalyticsHandler = (options = {}) => {
  const {
    dataFetcher,
    cacheConfig = null,
    transform = null
  } = options;
  
  return asyncHandler(async (req, res) => {
    const { siteId } = req.query;
    
    if (!siteId) {
      return sendErrorResponse(res, 400, 'Site ID is required');
    }
    
    let data;
    
    if (cacheConfig) {
      const { createCacheKey } = require('./routeHelpers');
      const { defaultCache } = require('../../server/utils/cacheManager');
      
      const cacheKey = createCacheKey(cacheConfig.keyPrefix, req.query);
      
      data = await defaultCache.wrap(
        cacheKey,
        () => dataFetcher(req.query),
        cacheConfig.ttl
      );
    } else {
      data = await dataFetcher(req.query);
    }
    
    const responseData = transform ? transform(data) : data;
    
    return sendSuccessResponse(res, responseData);
  });
};

module.exports = {
  createGetByIdHandler,
  createGetListHandler,
  createPostHandler,
  createUpdateHandler,
  createDeleteHandler,
  createLoginHandler,
  createTeamMemberHandler,
  createAnalyticsHandler
};