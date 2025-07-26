/**
 * API Utilities Usage Examples
 * 
 * This file demonstrates how to use the centralized API utilities
 * to replace common patterns found throughout the codebase.
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Import API utilities
const {
  httpClient,
  responseHelpers,
  errorHandlers,
  configHelpers,
  requestHelpers
} = require('./index');

// Example 1: Setting up Express app with centralized configurations
function setupExpressApp() {
  const app = express();

  // Trust proxy (for rate limiting and IP detection)
  app.set('trust proxy', 1);

  // CORS configuration
  const corsConfig = configHelpers.createCorsConfig({
    origins: ['http://localhost:3000', 'https://app.cryptique.io']
  });
  app.use(cors(corsConfig));

  // Rate limiting
  const generalRateLimit = rateLimit(configHelpers.createRateLimitConfig());
  const authRateLimit = rateLimit(configHelpers.createAuthRateLimitConfig());
  
  app.use('/api/', generalRateLimit);
  app.use('/api/auth/', authRateLimit);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global error handler
  app.use(errorHandlers.errorMiddleware);

  return app;
}

// Example 2: Creating API clients for different services
function createApiClients() {
  // Backend API client
  const backendClient = httpClient.createBackendClient({
    defaultTimeout: 15000,
    retryCount: 3
  });

  // Server API client
  const serverClient = httpClient.createServerClient({
    defaultTimeout: 10000
  });

  // Authenticated client
  const authClient = httpClient.createAuthenticatedClient('your-jwt-token');

  return { backendClient, serverClient, authClient };
}

// Example 3: Route handler with standardized request processing
const exampleRouteHandler = responseHelpers.asyncHandler(async (req, res) => {
  try {
    // Extract required parameters
    const { siteId } = requestHelpers.extractRequiredParams(req, ['siteId'], 'params');
    
    // Extract optional query parameters
    const { startDate, endDate } = requestHelpers.extractOptionalParams(req, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: new Date()
    }, 'query');

    // Extract pagination
    const pagination = requestHelpers.extractPaginationParams(req);

    // Validate team access
    const Team = require('../../backend/models/Team'); // Adjust path as needed
    const team = await requestHelpers.validateTeamAccess(req, req.body.teamId, Team);

    // Make API call to backend
    const { backendClient } = createApiClients();
    const response = await backendClient.standard(`/analytics/${siteId}`, {
      method: 'GET',
      params: { startDate, endDate, ...pagination }
    });

    // Send standardized success response
    responseHelpers.sendPaginated(res, response.data.results, {
      page: pagination.page,
      limit: pagination.limit,
      total: response.data.total
    });

  } catch (error) {
    // Error will be handled by global error handler
    throw error;
  }
});

// Example 4: Authentication middleware using error handlers
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
      throw new errorHandlers.AuthenticationError('No token provided');
    }

    // Verify token (simplified example)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    next(errorHandlers.handleAuthError(error));
  }
};

// Example 5: Team access validation middleware
const teamAccessMiddleware = (Model) => {
  return responseHelpers.asyncHandler(async (req, res, next) => {
    const teamId = req.params.teamId || req.body.teamId;
    const team = await requestHelpers.validateTeamAccess(req, teamId, Model);
    req.team = team; // Attach team to request
    next();
  });
};

// Example 6: Resource limit checking (based on existing patterns)
const resourceLimitMiddleware = (resourceType) => {
  return responseHelpers.asyncHandler(async (req, res, next) => {
    if (!req.team) {
      throw new errorHandlers.BadRequestError('Team information required');
    }

    const team = req.team;
    const subscriptionPlan = team.subscription?.plan || 'free';
    
    // Define limits (this would come from a configuration)
    const planLimits = {
      free: { websites: 1, smartContracts: 1 },
      pro: { websites: 10, smartContracts: 5 },
      enterprise: { websites: 100, smartContracts: 50 }
    };

    const limits = planLimits[subscriptionPlan];
    if (!limits) {
      throw new errorHandlers.BadRequestError('Invalid subscription plan');
    }

    // Check current usage (simplified example)
    const currentCount = await getCurrentResourceCount(team._id, resourceType);
    
    if (currentCount >= limits[resourceType]) {
      throw new errorHandlers.AuthorizationError(
        `You have reached the maximum number of ${resourceType} (${limits[resourceType]}) allowed on your ${subscriptionPlan} plan.`
      );
    }

    next();
  });
};

// Example 7: Health check endpoint with API key validation
function createHealthCheckRoute() {
  const router = express.Router();
  
  // Public health check
  router.get('/', (req, res) => {
    responseHelpers.sendSuccess(res, {
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  // Detailed health check (requires API key)
  router.get('/detailed', 
    configHelpers.createHealthCheckValidator(),
    responseHelpers.asyncHandler(async (req, res) => {
      // Check database connection, external services, etc.
      const healthData = {
        status: 'ok',
        database: 'connected',
        services: {
          backend: 'healthy',
          server: 'healthy'
        },
        timestamp: new Date().toISOString()
      };

      responseHelpers.sendSuccess(res, healthData);
    })
  );

  return router;
}

// Example 8: SDK route with permissive CORS
function createSdkRoute() {
  const router = express.Router();
  
  // SDK-specific CORS (more permissive)
  const sdkCors = cors(configHelpers.createSdkCorsConfig());
  router.use(sdkCors);

  // Handle OPTIONS requests
  router.use(configHelpers.createOptionsHandler());

  // SDK tracking endpoint
  router.post('/track', 
    responseHelpers.asyncHandler(async (req, res) => {
      // Process tracking data
      const trackingData = req.body;
      
      // Validate required fields
      const { siteId, event } = requestHelpers.extractRequiredParams(req, ['siteId', 'event']);
      
      // Process the tracking event
      // ... processing logic ...

      responseHelpers.sendSuccess(res, { received: true });
    })
  );

  return router;
}

// Example 9: Error handling in route
const errorProneRoute = responseHelpers.asyncHandler(async (req, res) => {
  try {
    // Some operation that might fail
    const result = await someAsyncOperation();
    
    if (!result) {
      throw new errorHandlers.NotFoundError('Data');
    }

    responseHelpers.sendSuccess(res, result);
    
  } catch (error) {
    // Handle specific error types
    if (error.code === 11000) {
      throw errorHandlers.handleDatabaseError(error);
    }
    
    if (error.response) {
      throw errorHandlers.handleApiError(error);
    }
    
    // Re-throw to be handled by global error handler
    throw error;
  }
});

// Example 10: Complete route setup with all utilities
function createCompleteRoute() {
  const router = express.Router();

  // Apply middleware
  router.use(authMiddleware);
  router.use(teamAccessMiddleware(require('../../backend/models/Team')));

  // Route with full request processing
  router.get('/analytics/:siteId',
    resourceLimitMiddleware('analytics'),
    configHelpers.createTimeoutMiddleware('complex'),
    responseHelpers.asyncHandler(async (req, res) => {
      // Extract and validate parameters
      const siteId = requestHelpers.extractSiteId(req);
      const pagination = requestHelpers.extractPaginationParams(req);
      const filters = requestHelpers.extractFilterParams(req, {
        allowedFields: ['startDate', 'endDate', 'eventType'],
        dateFields: ['startDate', 'endDate']
      });

      // Make API call
      const { backendClient } = createApiClients();
      const response = await backendClient.complex(`/analytics/${siteId}`, {
        method: 'GET',
        params: { ...filters, ...pagination }
      });

      // Send response
      responseHelpers.sendPaginated(res, response.data.results, {
        ...pagination,
        total: response.data.total
      });
    })
  );

  return router;
}

// Helper function (would be implemented elsewhere)
async function getCurrentResourceCount(teamId, resourceType) {
  // This would query the database to get current resource count
  return 0; // Placeholder
}

async function someAsyncOperation() {
  // Placeholder for some async operation
  return { data: 'example' };
}

module.exports = {
  setupExpressApp,
  createApiClients,
  exampleRouteHandler,
  authMiddleware,
  teamAccessMiddleware,
  resourceLimitMiddleware,
  createHealthCheckRoute,
  createSdkRoute,
  errorProneRoute,
  createCompleteRoute
};