/**
 * Middleware Utilities Index
 * 
 * This module exports all middleware-related utilities including CORS configuration,
 * rate limiting, authentication middleware, route helpers, patterns, and factory functions.
 */

const corsConfig = require('./corsConfig');
const rateLimitConfig = require('./rateLimitConfig');
const authMiddleware = require('./authMiddleware');
const routeHelpers = require('./routeHelpers');
const routePatterns = require('./routePatterns');
const routeFactory = require('./routeFactory');

module.exports = {
  corsConfig,
  rateLimitConfig,
  authMiddleware,
  routeHelpers,
  routePatterns,
  routeFactory,
  
  // Re-export commonly used CORS functions for convenience
  getCorsMiddleware: corsConfig.getCorsMiddleware,
  setCorsHeaders: corsConfig.setCorsHeaders,
  getEnvironmentCors: corsConfig.getEnvironmentCors,
  isOriginAllowed: corsConfig.isOriginAllowed,
  
  // Re-export commonly used rate limiting functions for convenience
  getRateLimitMiddleware: rateLimitConfig.getRateLimitMiddleware,
  createCustomRateLimit: rateLimitConfig.createCustomRateLimit,
  getEnvironmentRateLimit: rateLimitConfig.getEnvironmentRateLimit,
  createRateLimiters: rateLimitConfig.createRateLimiters,
  
  // Re-export commonly used authentication functions for convenience
  getAuthMiddleware: authMiddleware.getAuthMiddleware,
  createAuthMiddlewares: authMiddleware.createAuthMiddlewares,
  createTeamAccessMiddleware: authMiddleware.createTeamAccessMiddleware,
  createResourceOwnershipMiddleware: authMiddleware.createResourceOwnershipMiddleware,
  createSubscriptionAccessMiddleware: authMiddleware.createSubscriptionAccessMiddleware,
  
  // Re-export route helper functions for convenience
  asyncHandler: routeHelpers.asyncHandler,
  sendErrorResponse: routeHelpers.sendErrorResponse,
  sendSuccessResponse: routeHelpers.sendSuccessResponse,
  validateRequest: routeHelpers.validateRequest,
  dbOperation: routeHelpers.dbOperation,
  createCacheKey: routeHelpers.createCacheKey,
  createRoute: routeHelpers.createRoute,
  createHealthCheck: routeHelpers.createHealthCheck,
  handlePagination: routeHelpers.handlePagination,
  validateDateRange: routeHelpers.validateDateRange,
  
  // Re-export route pattern functions for convenience
  createGetByIdHandler: routePatterns.createGetByIdHandler,
  createGetListHandler: routePatterns.createGetListHandler,
  createPostHandler: routePatterns.createPostHandler,
  createUpdateHandler: routePatterns.createUpdateHandler,
  createDeleteHandler: routePatterns.createDeleteHandler,
  createLoginHandler: routePatterns.createLoginHandler,
  createTeamMemberHandler: routePatterns.createTeamMemberHandler,
  createAnalyticsHandler: routePatterns.createAnalyticsHandler,
  
  // Re-export route factory functions for convenience
  createCrudRouter: routeFactory.createCrudRouter,
  createAuthRouter: routeFactory.createAuthRouter,
  createTeamRouter: routeFactory.createTeamRouter,
  createAnalyticsRouter: routeFactory.createAnalyticsRouter,
  createHealthRouter: routeFactory.createHealthRouter,
  buildRoute: routeFactory.buildRoute,
  applyRoutes: routeFactory.applyRoutes
};