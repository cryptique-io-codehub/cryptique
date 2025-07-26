/**
 * Route factory for creating standardized routes
 * Combines route helpers and patterns into easy-to-use factory functions
 */

const express = require('express');
const { createRoute } = require('./routeHelpers');
const {
  createGetByIdHandler,
  createGetListHandler,
  createPostHandler,
  createUpdateHandler,
  createDeleteHandler,
  createLoginHandler,
  createTeamMemberHandler,
  createAnalyticsHandler
} = require('./routePatterns');

/**
 * Creates a complete CRUD router for a model
 */
const createCrudRouter = (Model, options = {}) => {
  const router = express.Router();
  const {
    basePath = '',
    auth = 'standard',
    rateLimit = 'default',
    cors = 'default',
    permissions = {},
    transforms = {},
    hooks = {}
  } = options;
  
  // GET /resources - List resources
  if (!options.excludeList) {
    const listRoute = createRoute({
      auth: permissions.list?.auth || auth,
      rateLimit: permissions.list?.rateLimit || rateLimit,
      cors: permissions.list?.cors || cors,
      validation: permissions.list?.validation
    });
    
    router.get(
      basePath || '/',
      ...listRoute(createGetListHandler(Model, {
        populate: options.populate,
        select: options.select,
        defaultSort: options.defaultSort,
        filterFn: options.filterFn,
        transform: transforms.list
      }))
    );
  }
  
  // GET /resources/:id - Get single resource
  if (!options.excludeGet) {
    const getRoute = createRoute({
      auth: permissions.get?.auth || auth,
      rateLimit: permissions.get?.rateLimit || rateLimit,
      cors: permissions.get?.cors || cors,
      validation: { params: ['id'] }
    });
    
    router.get(
      `${basePath}/:id`,
      ...getRoute(createGetByIdHandler(Model, {
        populate: options.populate,
        select: options.select,
        transform: transforms.get,
        notFoundMessage: options.notFoundMessage
      }))
    );
  }
  
  // POST /resources - Create resource
  if (!options.excludeCreate) {
    const createRoute = createRoute({
      auth: permissions.create?.auth || auth,
      rateLimit: permissions.create?.rateLimit || rateLimit,
      cors: permissions.create?.cors || cors,
      validation: permissions.create?.validation
    });
    
    router.post(
      basePath || '/',
      ...createRoute(createPostHandler(Model, {
        transform: transforms.create,
        beforeSave: hooks.beforeSave,
        afterSave: hooks.afterSave,
        successMessage: options.createMessage
      }))
    );
  }
  
  // PUT /resources/:id - Update resource
  if (!options.excludeUpdate) {
    const updateRoute = createRoute({
      auth: permissions.update?.auth || auth,
      rateLimit: permissions.update?.rateLimit || rateLimit,
      cors: permissions.update?.cors || cors,
      validation: { params: ['id'] }
    });
    
    router.put(
      `${basePath}/:id`,
      ...updateRoute(createUpdateHandler(Model, {
        transform: transforms.update,
        beforeUpdate: hooks.beforeUpdate,
        afterUpdate: hooks.afterUpdate,
        successMessage: options.updateMessage,
        notFoundMessage: options.notFoundMessage
      }))
    );
  }
  
  // DELETE /resources/:id - Delete resource
  if (!options.excludeDelete) {
    const deleteRoute = createRoute({
      auth: permissions.delete?.auth || auth,
      rateLimit: permissions.delete?.rateLimit || rateLimit,
      cors: permissions.delete?.cors || cors,
      validation: { params: ['id'] }
    });
    
    router.delete(
      `${basePath}/:id`,
      ...deleteRoute(createDeleteHandler(Model, {
        beforeDelete: hooks.beforeDelete,
        afterDelete: hooks.afterDelete,
        successMessage: options.deleteMessage,
        notFoundMessage: options.notFoundMessage
      }))
    );
  }
  
  return router;
};

/**
 * Creates an authentication router
 */
const createAuthRouter = (options = {}) => {
  const router = express.Router();
  const {
    UserModel,
    validateCredentials,
    generateTokens,
    rateLimit = 'auth'
  } = options;
  
  // Login route
  const loginRoute = createRoute({
    rateLimit: 'loginFailure',
    validation: { body: ['email', 'password'] }
  });
  
  router.post(
    '/login',
    ...loginRoute(createLoginHandler({
      UserModel,
      validateCredentials,
      generateTokens
    }))
  );
  
  // Add other auth routes as needed
  // (register, logout, refresh, etc.)
  
  return router;
};

/**
 * Creates a team management router
 */
const createTeamRouter = (options = {}) => {
  const router = express.Router();
  const {
    TeamModel,
    UserModel,
    checkPermissions,
    validateLimits,
    auth = 'standard'
  } = options;
  
  // Add member route
  const addMemberRoute = createRoute({
    auth,
    validation: { body: ['email', 'teamName', 'role'] }
  });
  
  router.post(
    '/add-member',
    ...addMemberRoute(createTeamMemberHandler('add', {
      TeamModel,
      UserModel,
      checkPermissions,
      validateLimits
    }))
  );
  
  // Remove member route
  const removeMemberRoute = createRoute({
    auth,
    validation: { body: ['email', 'teamName'] }
  });
  
  router.post(
    '/remove-member',
    ...removeMemberRoute(createTeamMemberHandler('remove', {
      TeamModel,
      UserModel,
      checkPermissions
    }))
  );
  
  return router;
};

/**
 * Creates an analytics router
 */
const createAnalyticsRouter = (options = {}) => {
  const router = express.Router();
  const {
    cors = 'analytics',
    rateLimit = 'analytics',
    cacheConfig = {}
  } = options;
  
  // Chart data route
  if (options.chartDataFetcher) {
    const chartRoute = createRoute({
      cors,
      rateLimit,
      validation: { query: ['siteId'] }
    });
    
    router.get(
      '/chart',
      ...chartRoute(createAnalyticsHandler({
        dataFetcher: options.chartDataFetcher,
        cacheConfig: cacheConfig.chart,
        transform: options.chartTransform
      }))
    );
  }
  
  // User journeys route
  if (options.userJourneysFetcher) {
    const journeysRoute = createRoute({
      cors,
      rateLimit,
      validation: { query: ['siteId'] }
    });
    
    router.get(
      '/user-journeys',
      ...journeysRoute(createAnalyticsHandler({
        dataFetcher: options.userJourneysFetcher,
        cacheConfig: cacheConfig.userJourneys,
        transform: options.journeysTransform
      }))
    );
  }
  
  // User sessions route
  if (options.userSessionsFetcher) {
    const sessionsRoute = createRoute({
      cors,
      rateLimit,
      validation: { query: ['userId'] }
    });
    
    router.get(
      '/user-sessions',
      ...sessionsRoute(createAnalyticsHandler({
        dataFetcher: options.userSessionsFetcher,
        cacheConfig: cacheConfig.userSessions,
        transform: options.sessionsTransform
      }))
    );
  }
  
  return router;
};

/**
 * Creates a health check router
 */
const createHealthRouter = (checks = {}) => {
  const router = express.Router();
  const { createHealthCheck } = require('./routeHelpers');
  
  // Basic health check
  router.get('/', createHealthCheck());
  
  // Detailed health check with custom checks
  router.get('/detailed', createHealthCheck(checks));
  
  return router;
};

/**
 * Route builder for custom routes
 */
const buildRoute = (method, path, handler, options = {}) => {
  const route = createRoute(options);
  return {
    method: method.toLowerCase(),
    path,
    handlers: route(handler)
  };
};

/**
 * Applies routes to a router
 */
const applyRoutes = (router, routes) => {
  routes.forEach(route => {
    router[route.method](route.path, ...route.handlers);
  });
  return router;
};

module.exports = {
  createCrudRouter,
  createAuthRouter,
  createTeamRouter,
  createAnalyticsRouter,
  createHealthRouter,
  buildRoute,
  applyRoutes
};