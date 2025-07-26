/**
 * CORS Configuration Examples
 * 
 * This file demonstrates how to use the centralized CORS configuration
 * in different scenarios across the application.
 */

const express = require('express');
const { getCorsMiddleware, setCorsHeaders, getEnvironmentCors } = require('./corsConfig');

// Example 1: Basic usage with standard CORS
const app1 = express();
app1.use(getCorsMiddleware('standard'));

// Example 2: SDK routes with permissive CORS
const sdkRouter = express.Router();
sdkRouter.use(getCorsMiddleware('sdk'));
sdkRouter.get('/analytics/:siteId', (req, res) => {
  res.json({ message: 'Analytics data' });
});

// Example 3: Authentication routes with strict CORS
const authRouter = express.Router();
authRouter.use(getCorsMiddleware('auth'));
authRouter.post('/login', (req, res) => {
  res.json({ message: 'Login successful' });
});

// Example 4: Custom CORS configuration
const customCorsRouter = express.Router();
customCorsRouter.use(getCorsMiddleware('standard', {
  origin: ['https://custom-domain.com'],
  methods: ['GET', 'POST']
}));

// Example 5: Manual CORS headers (for special cases)
const manualCorsRouter = express.Router();
manualCorsRouter.use(setCorsHeaders('analytics'));
manualCorsRouter.get('/special-endpoint', (req, res) => {
  res.json({ message: 'Special endpoint with manual CORS' });
});

// Example 6: Environment-aware CORS
const envAwareApp = express();
envAwareApp.use(getEnvironmentCors('standard'));

// Example 7: Route-specific CORS
const mixedRouter = express.Router();

// Public endpoints - permissive CORS
mixedRouter.use('/public/*', getCorsMiddleware('sdk'));

// Private endpoints - strict CORS
mixedRouter.use('/private/*', getCorsMiddleware('auth'));

// Analytics endpoints - analytics-specific CORS
mixedRouter.use('/analytics/*', getCorsMiddleware('analytics'));

// Example 8: Conditional CORS based on request path
const conditionalCorsApp = express();
conditionalCorsApp.use((req, res, next) => {
  if (req.path.startsWith('/api/sdk/')) {
    return getCorsMiddleware('sdk')(req, res, next);
  } else if (req.path.startsWith('/api/auth/')) {
    return getCorsMiddleware('auth')(req, res, next);
  } else if (req.path.startsWith('/api/analytics/')) {
    return getCorsMiddleware('analytics')(req, res, next);
  } else {
    return getCorsMiddleware('standard')(req, res, next);
  }
});

// Example 9: Preflight handling
const preflightRouter = express.Router();
preflightRouter.use(getCorsMiddleware('standard'));

// Handle preflight requests explicitly if needed
preflightRouter.options('*', (req, res) => {
  res.sendStatus(200);
});

// Example 10: Error handling with CORS
const errorHandlingApp = express();
errorHandlingApp.use(getCorsMiddleware('standard'));

errorHandlingApp.use((err, req, res, next) => {
  // Ensure CORS headers are set even for errors
  if (err.message && err.message.includes('CORS')) {
    res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
  } else {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

module.exports = {
  app1,
  sdkRouter,
  authRouter,
  customCorsRouter,
  manualCorsRouter,
  envAwareApp,
  mixedRouter,
  conditionalCorsApp,
  preflightRouter,
  errorHandlingApp
};
/**

 * Rate Limiting Configuration Examples
 */

const { getRateLimitMiddleware, createCustomRateLimit, getEnvironmentRateLimit, createRateLimiters } = require('./rateLimitConfig');

// Example 11: Basic rate limiting usage
const basicApp = express();
basicApp.use(getRateLimitMiddleware('standard'));

// Example 12: Authentication routes with strict rate limiting
const authRouter2 = express.Router();
authRouter2.use(getRateLimitMiddleware('auth'));
authRouter2.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint with auth rate limiting' });
});

// Example 13: SDK routes with permissive rate limiting
const sdkRouter2 = express.Router();
sdkRouter2.use(getRateLimitMiddleware('sdk'));
sdkRouter2.get('/analytics/:siteId', (req, res) => {
  res.json({ message: 'SDK endpoint with SDK rate limiting' });
});

// Example 14: Custom rate limiting configuration
const customRateLimitRouter = express.Router();
customRateLimitRouter.use(createCustomRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 requests per 5 minutes
  message: 'Custom rate limit exceeded'
}));

// Example 15: Environment-aware rate limiting
const envAwareApp2 = express();
envAwareApp2.use(getEnvironmentRateLimit('standard'));

// Example 16: Multiple rate limiters for different tiers
const tieredApp = express();
const rateLimiters = createRateLimiters();

// Apply different rate limits to different routes
tieredApp.use('/api/public', rateLimiters.standard);
tieredApp.use('/api/auth', rateLimiters.auth);
tieredApp.use('/api/sdk', rateLimiters.sdk);
tieredApp.use('/api/admin', rateLimiters.sensitive);
tieredApp.use('/health', rateLimiters.health);

// Example 17: Rate limiting with Redis (for production)
const redisApp = express();
const redisRateLimiters = createRateLimiters({
  redis: process.env.REDIS_URL
});
redisApp.use('/api', redisRateLimiters.standard);

// Example 18: Conditional rate limiting based on request path
const conditionalRateLimitApp = express();
conditionalRateLimitApp.use((req, res, next) => {
  if (req.path.startsWith('/api/auth/')) {
    return getRateLimitMiddleware('auth')(req, res, next);
  } else if (req.path.startsWith('/api/sdk/')) {
    return getRateLimitMiddleware('sdk')(req, res, next);
  } else if (req.path.startsWith('/api/analytics/')) {
    return getRateLimitMiddleware('analytics')(req, res, next);
  } else if (req.path.startsWith('/health')) {
    return getRateLimitMiddleware('health')(req, res, next);
  } else {
    return getRateLimitMiddleware('standard')(req, res, next);
  }
});

// Example 19: Rate limiting with custom key generator
const customKeyRouter = express.Router();
customKeyRouter.use(createCustomRateLimit({
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  max: 100,
  windowMs: 15 * 60 * 1000
}));

// Example 20: Failed login attempt tracking
const loginRouter = express.Router();
const loginFailureLimit = getRateLimitMiddleware('loginFailure');

loginRouter.post('/login', loginFailureLimit, (req, res) => {
  // Login logic here
  const loginSuccessful = false; // This would be determined by your auth logic
  
  if (!loginSuccessful) {
    // Mark as failed login for rate limiting
    res.status(401);
  }
  
  res.json({ success: loginSuccessful });
});

module.exports = {
  // ... existing exports
  basicApp,
  authRouter2,
  sdkRouter2,
  customRateLimitRouter,
  envAwareApp2,
  tieredApp,
  redisApp,
  conditionalRateLimitApp,
  customKeyRouter,
  loginRouter
};/**

 * Authentication Middleware Examples
 */

const { getAuthMiddleware, createAuthMiddlewares, createTeamAccessMiddleware } = require('./authMiddleware');

// Example 21: Basic JWT authentication
const protectedRouter = express.Router();
protectedRouter.use(getAuthMiddleware('standard'));
protectedRouter.get('/profile', (req, res) => {
  res.json({ userId: req.userId, email: req.userEmail });
});

// Example 22: Optional authentication
const publicRouter = express.Router();
publicRouter.use(getAuthMiddleware('optional'));
publicRouter.get('/content', (req, res) => {
  const response = { content: 'Public content' };
  if (req.userId) {
    response.personalizedContent = 'Content for authenticated users';
  }
  res.json(response);
});

// Example 23: Strict authentication with user object
const strictRouter = express.Router();
// Assuming you have a User model
// const User = require('../models/User');
// strictRouter.use(getAuthMiddleware('strict', {}, User));
strictRouter.get('/dashboard', (req, res) => {
  res.json({ 
    user: req.user, // Full user object attached
    message: 'Dashboard data' 
  });
});

// Example 24: API key authentication
const apiRouter = express.Router();
apiRouter.use(getAuthMiddleware('apiKey'));
apiRouter.get('/data', (req, res) => {
  res.json({ 
    message: 'API data',
    authenticated: req.authenticated 
  });
});

// Example 25: SDK authentication
const sdkRouter3 = express.Router();
sdkRouter3.use(getAuthMiddleware('sdk'));
sdkRouter3.post('/track', (req, res) => {
  res.json({ 
    siteId: req.siteId,
    message: 'Event tracked' 
  });
});

// Example 26: Admin authentication
const adminRouter = express.Router();
// adminRouter.use(getAuthMiddleware('admin', {}, User));
adminRouter.get('/users', (req, res) => {
  res.json({ 
    message: 'Admin only endpoint',
    adminUser: req.user 
  });
});

// Example 27: Multiple authentication middleware
// const authMiddlewares = createAuthMiddlewares(User);
const multiAuthApp = express();

// Apply different auth to different routes
// multiAuthApp.use('/api/public', authMiddlewares.optional);
// multiAuthApp.use('/api/protected', authMiddlewares.standard);
// multiAuthApp.use('/api/admin', authMiddlewares.admin);
// multiAuthApp.use('/api/sdk', authMiddlewares.sdk);

// Example 28: Team access middleware
const teamRouter = express.Router();
// Assuming you have a Team model
// const Team = require('../models/Team');
// teamRouter.use(getAuthMiddleware('standard', {}, User));
// teamRouter.use(createTeamAccessMiddleware(Team, {
//   teamIdSource: 'params',
//   teamIdField: 'teamId',
//   requireRole: 'admin'
// }));
teamRouter.get('/team/:teamId/settings', (req, res) => {
  res.json({
    team: req.team,
    member: req.teamMember,
    role: req.teamRole
  });
});

// Example 29: Resource ownership middleware
const resourceRouter = express.Router();
// resourceRouter.use(getAuthMiddleware('standard', {}, User));

// Example resource fetcher function
const fetchProject = async (projectId) => {
  // This would fetch from your database
  // return await Project.findById(projectId);
  return { _id: projectId, user: 'user123', name: 'Sample Project' };
};

// resourceRouter.use('/project/:id', createResourceOwnershipMiddleware(fetchProject, {
//   resourceIdSource: 'params',
//   resourceIdField: 'id',
//   ownerField: 'user'
// }));

resourceRouter.get('/project/:id', (req, res) => {
  res.json({
    project: req.resource,
    accessType: req.accessType
  });
});

// Example 30: Subscription access middleware
const subscriptionRouter = express.Router();
// subscriptionRouter.use(getAuthMiddleware('standard', {}, User));
// subscriptionRouter.use(createTeamAccessMiddleware(Team));
// subscriptionRouter.use(createSubscriptionAccessMiddleware('advanced_analytics', {
//   allowGracePeriod: true,
//   gracePeriodDays: 7
// }));

subscriptionRouter.get('/analytics/advanced', (req, res) => {
  res.json({
    message: 'Advanced analytics data',
    plan: req.subscriptionPlan,
    status: req.subscriptionStatus
  });
});

// Example 31: Combined authentication flow
const combinedRouter = express.Router();

// Step 1: JWT Authentication
// combinedRouter.use(getAuthMiddleware('standard', {}, User));

// Step 2: Team Access (for team-based endpoints)
// combinedRouter.use('/team/:teamId/*', createTeamAccessMiddleware(Team));

// Step 3: Subscription Access (for premium features)
// combinedRouter.use('/team/:teamId/premium/*', createSubscriptionAccessMiddleware('premium_features'));

combinedRouter.get('/team/:teamId/premium/reports', (req, res) => {
  res.json({
    user: req.user,
    team: req.team,
    subscription: {
      plan: req.subscriptionPlan,
      status: req.subscriptionStatus
    },
    message: 'Premium reports data'
  });
});

// Example 32: Custom authentication configuration
const customAuthRouter = express.Router();
customAuthRouter.use(getAuthMiddleware('standard', {
  jwtConfig: {
    secret: process.env.CUSTOM_JWT_SECRET,
    algorithms: ['HS256'],
    clockTolerance: 60
  },
  errorMessages: {
    noToken: 'Custom: Authentication required',
    invalidToken: 'Custom: Invalid token provided',
    tokenExpired: 'Custom: Your session has expired'
  }
}));

// Example 33: Conditional authentication
const conditionalAuthApp = express();
conditionalAuthApp.use((req, res, next) => {
  if (req.path.startsWith('/api/public/')) {
    return getAuthMiddleware('optional')(req, res, next);
  } else if (req.path.startsWith('/api/admin/')) {
    return getAuthMiddleware('admin')(req, res, next);
  } else if (req.path.startsWith('/api/sdk/')) {
    return getAuthMiddleware('sdk')(req, res, next);
  } else {
    return getAuthMiddleware('standard')(req, res, next);
  }
});

module.exports = {
  // ... existing exports
  protectedRouter,
  publicRouter,
  strictRouter,
  apiRouter,
  sdkRouter3,
  adminRouter,
  multiAuthApp,
  teamRouter,
  resourceRouter,
  subscriptionRouter,
  combinedRouter,
  customAuthRouter,
  conditionalAuthApp
};
/**
 * 
Consolidated Authentication Patterns from Existing Codebase
 * 
 * These examples show how the centralized authentication middleware
 * replaces the previous authentication patterns found across the codebase.
 */

// Example 34: Backend route pattern (userRouter.js style)
const backendUserRouter = express.Router();
const { getRateLimitMiddleware } = require('./rateLimitConfig');

const authMiddleware = getAuthMiddleware('standard');
const authRateLimit = getRateLimitMiddleware('auth');
const loginFailureRateLimit = getRateLimitMiddleware('loginFailure');

// Public authentication endpoints with rate limiting
backendUserRouter.post('/login', loginFailureRateLimit, (req, res) => {
  res.json({ message: 'Login endpoint' });
});

backendUserRouter.post('/create', authRateLimit, (req, res) => {
  res.json({ message: 'User creation endpoint' });
});

// Protected endpoints requiring authentication
backendUserRouter.post('/refresh-token', authMiddleware, (req, res) => {
  res.json({ userId: req.userId, message: 'Token refreshed' });
});

backendUserRouter.post('/logout', authMiddleware, (req, res) => {
  res.json({ userId: req.userId, message: 'Logged out' });
});

// Example 35: Backend team route pattern (teamRouter.js style)
const backendTeamRouter = express.Router();
const { getCorsMiddleware } = require('./corsConfig');

const corsOptions = getCorsMiddleware('standard');
backendTeamRouter.use(corsOptions);

// All team routes require authentication
backendTeamRouter.use(authMiddleware);

backendTeamRouter.get('/details', (req, res) => {
  res.json({ userId: req.userId, message: 'Team details' });
});

backendTeamRouter.post('/create', (req, res) => {
  res.json({ userId: req.userId, message: 'Team created' });
});

backendTeamRouter.get('/:teamId/members', (req, res) => {
  res.json({ 
    userId: req.userId, 
    teamId: req.params.teamId,
    message: 'Team members' 
  });
});

// Example 36: Server RAG route pattern (ragRoutes.js style)
const serverRagRouter = express.Router();

// All RAG endpoints require authentication
serverRagRouter.use(authMiddleware);

serverRagRouter.post('/retrieve', (req, res) => {
  const userId = req.userId; // Standardized access to user ID
  const { query, siteId } = req.body;
  
  res.json({ 
    userId,
    query,
    siteId,
    message: 'RAG context retrieved' 
  });
});

serverRagRouter.post('/generate', (req, res) => {
  const userId = req.userId; // Standardized access to user ID
  const { query, siteId } = req.body;
  
  res.json({ 
    userId,
    query,
    siteId,
    message: 'RAG response generated' 
  });
});

serverRagRouter.post('/documents', (req, res) => {
  const userId = req.userId; // Standardized access to user ID
  const { text, siteId } = req.body;
  
  res.json({ 
    userId,
    siteId,
    message: 'Document added to knowledge base' 
  });
});

// Example 37: Server retention route pattern (retention.js style)
const serverRetentionRouter = express.Router();
const sensitiveRateLimit = getRateLimitMiddleware('sensitive');

// Team-specific endpoints require standard authentication
serverRetentionRouter.get('/:teamId/status', authMiddleware, (req, res) => {
  res.json({ 
    userId: req.userId,
    teamId: req.params.teamId,
    message: 'Data retention status' 
  });
});

serverRetentionRouter.post('/:teamId/recover', authMiddleware, (req, res) => {
  res.json({ 
    userId: req.userId,
    teamId: req.params.teamId,
    message: 'Data recovery initiated' 
  });
});

// Admin endpoints require admin authentication and rate limiting
const adminAuthMiddleware = getAuthMiddleware('admin');

serverRetentionRouter.get('/metrics', sensitiveRateLimit, adminAuthMiddleware, (req, res) => {
  res.json({ 
    adminUser: req.user, // Full user object for admin routes
    message: 'System metrics' 
  });
});

serverRetentionRouter.get('/active-tasks', sensitiveRateLimit, adminAuthMiddleware, (req, res) => {
  res.json({ 
    adminUser: req.user,
    message: 'Active tasks list' 
  });
});

serverRetentionRouter.post('/run-tasks', sensitiveRateLimit, adminAuthMiddleware, (req, res) => {
  res.json({ 
    adminUser: req.user,
    message: 'Tasks scheduled by admin' 
  });
});

// Example 38: Server routes with subscription middleware
const serverSubscriptionRouter = express.Router();
const subscriptionCheck = require('../../server/middleware/subscriptionCheck');

// Combine authentication with subscription checking
serverSubscriptionRouter.use(authMiddleware);
serverSubscriptionRouter.use(subscriptionCheck);

serverSubscriptionRouter.get('/:teamId/websites', (req, res) => {
  res.json({
    userId: req.userId,
    team: req.team,
    subscription: req.subscription,
    message: 'Team websites'
  });
});

serverSubscriptionRouter.post('/:teamId/websites', (req, res) => {
  res.json({
    userId: req.userId,
    team: req.team,
    subscription: req.subscription,
    message: 'Website created'
  });
});

// Example 39: Migration from old auth patterns
// OLD PATTERN (removed):
// const { verifyToken } = require('../middleware/auth');
// router.post('/endpoint', verifyToken, (req, res) => {
//   const userId = req.userId; // This was set by verifyToken
//   res.json({ userId });
// });

// NEW PATTERN (standardized):
const migratedRouter = express.Router();
const standardAuth = getAuthMiddleware('standard');

migratedRouter.post('/endpoint', standardAuth, (req, res) => {
  const userId = req.userId; // Standardized across all services
  const userEmail = req.userEmail; // Additional user info available
  res.json({ userId, userEmail });
});

// Example 40: Complete service authentication setup
const completeServiceApp = express();

// Apply CORS first
completeServiceApp.use(getCorsMiddleware('standard'));

// Apply rate limiting
completeServiceApp.use(getRateLimitMiddleware('standard'));

// Public routes (no authentication)
completeServiceApp.use('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Authentication routes (with specific rate limiting)
const authRoutes = express.Router();
authRoutes.use(getRateLimitMiddleware('auth'));
authRoutes.post('/login', (req, res) => {
  res.json({ message: 'Login' });
});
authRoutes.post('/register', (req, res) => {
  res.json({ message: 'Register' });
});
completeServiceApp.use('/auth', authRoutes);

// Protected routes (require authentication)
const protectedRoutes = express.Router();
protectedRoutes.use(getAuthMiddleware('standard'));
protectedRoutes.get('/profile', (req, res) => {
  res.json({ userId: req.userId, email: req.userEmail });
});
protectedRoutes.get('/dashboard', (req, res) => {
  res.json({ userId: req.userId, message: 'Dashboard data' });
});
completeServiceApp.use('/api', protectedRoutes);

// Admin routes (require admin authentication)
const adminRoutes = express.Router();
adminRoutes.use(getRateLimitMiddleware('sensitive'));
adminRoutes.use(getAuthMiddleware('admin'));
adminRoutes.get('/users', (req, res) => {
  res.json({ adminUser: req.user, message: 'All users' });
});
adminRoutes.post('/system/restart', (req, res) => {
  res.json({ adminUser: req.user, message: 'System restart initiated' });
});
completeServiceApp.use('/admin', adminRoutes);

// SDK routes (use SDK authentication)
const sdkRoutes = express.Router();
sdkRoutes.use(getRateLimitMiddleware('sdk'));
sdkRoutes.use(getAuthMiddleware('sdk'));
sdkRoutes.post('/track', (req, res) => {
  res.json({ siteId: req.siteId, message: 'Event tracked' });
});
sdkRoutes.get('/analytics/:siteId', (req, res) => {
  res.json({ siteId: req.siteId, message: 'Analytics data' });
});
completeServiceApp.use('/sdk', sdkRoutes);

module.exports = {
  // ... existing exports
  backendUserRouter,
  backendTeamRouter,
  serverRagRouter,
  serverRetentionRouter,
  serverSubscriptionRouter,
  migratedRouter,
  completeServiceApp
};
/**

 * Route Helper and Pattern Examples
 * 
 * These examples demonstrate the new route helpers, patterns, and factory functions
 * that provide standardized ways to create routes with common functionality.
 */

const {
  createRoute,
  createCrudRouter,
  createHealthRouter,
  createAnalyticsRouter,
  asyncHandler,
  sendSuccessResponse,
  sendErrorResponse,
  validateRequest,
  handlePagination,
  validateDateRange,
  buildRoute,
  applyRoutes
} = require('./index');

// Example 41: Using createRoute helper for cleaner route definitions
const routeHelperRouter = express.Router();

// Create a route with multiple middleware applied
const protectedRoute = createRoute({
  auth: 'standard',
  rateLimit: 'default',
  cors: 'analytics',
  validation: { body: ['name', 'email'] }
});

routeHelperRouter.post('/users', ...protectedRoute(asyncHandler(async (req, res) => {
  const { name, email } = req.body;
  
  // Simulate user creation
  const user = { id: 1, name, email, createdAt: new Date() };
  
  return sendSuccessResponse(res, { user }, 'User created successfully', 201);
})));

// Example 42: CRUD Router for a User model
// Assuming you have a User model
// const User = require('../../backend/models/user');

// const userCrudRouter = createCrudRouter(User, {
//   auth: 'standard',
//   rateLimit: 'default',
//   cors: 'default',
//   populate: 'team',
//   select: '-password', // Exclude password field
//   permissions: {
//     create: { auth: 'admin' }, // Only admins can create users
//     delete: { auth: 'admin' }  // Only admins can delete users
//   },
//   transforms: {
//     list: (user) => ({
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       createdAt: user.createdAt
//     }),
//     get: (user) => ({
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       team: user.team,
//       createdAt: user.createdAt
//     })
//   }
// });

// Example 43: Health Check Router
const healthRouter = createHealthRouter({
  database: async () => {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      return { status: 'connected' };
    }
    throw new Error('Database not connected');
  },
  redis: async () => {
    // Simulate Redis check
    return { status: 'connected', memory: '10MB' };
  }
});

// Example 44: Analytics Router with caching
const analyticsRouterExample = createAnalyticsRouter({
  cors: 'analytics',
  rateLimit: 'analytics',
  chartDataFetcher: async (params) => {
    const { siteId, timeframe } = params;
    // Simulate fetching chart data
    return {
      siteId,
      timeframe,
      data: [
        { date: '2024-01-01', views: 100 },
        { date: '2024-01-02', views: 150 }
      ]
    };
  },
  userJourneysFetcher: async (params) => {
    const { siteId, teamId } = params;
    // Simulate fetching user journeys
    return {
      siteId,
      teamId,
      journeys: [
        { userId: 'user1', pages: ['/home', '/about', '/contact'] },
        { userId: 'user2', pages: ['/home', '/products'] }
      ]
    };
  },
  cacheConfig: {
    chart: {
      ttl: 'medium',
      keyPrefix: 'analytics:chart'
    },
    userJourneys: {
      ttl: 'short',
      keyPrefix: 'analytics:journeys'
    }
  }
});

// Example 45: Custom validation middleware usage
const customValidationRouter = express.Router();

customValidationRouter.post('/custom-validation',
  validateRequest({
    body: ['name', 'email'],
    query: ['type'],
    params: ['id']
  }),
  (req, res) => {
    res.json({ message: 'Validation passed', data: req.body });
  }
);

// Example 46: Pagination helper usage
const paginatedRouter = express.Router();

paginatedRouter.get('/items', asyncHandler(async (req, res) => {
  const pagination = handlePagination(req);
  
  // Simulate fetching data with pagination
  const items = Array.from({ length: pagination.limit }, (_, i) => ({
    id: pagination.skip + i + 1,
    name: `Item ${pagination.skip + i + 1}`
  }));
  
  const total = 1000; // Simulate total count
  const paginatedResponse = pagination.createResponse(items, total);
  
  return sendSuccessResponse(res, paginatedResponse);
}));

// Example 47: Date range validation usage
const dateRangeRouter = express.Router();

dateRangeRouter.get('/analytics', asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = validateDateRange(req);
    
    // Use validated dates in your logic
    const data = {
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      message: 'Analytics data for date range'
    };
    
    return sendSuccessResponse(res, data);
  } catch (error) {
    return sendErrorResponse(res, 400, error.message);
  }
}));

// Example 48: Manual route building with buildRoute
const manualRouteRouter = express.Router();

const routes = [
  buildRoute('GET', '/manual1', asyncHandler(async (req, res) => {
    return sendSuccessResponse(res, { message: 'Manual route 1' });
  }), {
    auth: 'standard',
    rateLimit: 'default'
  }),
  
  buildRoute('POST', '/manual2', asyncHandler(async (req, res) => {
    return sendSuccessResponse(res, { message: 'Manual route 2', data: req.body });
  }), {
    auth: 'admin',
    validation: { body: ['data'] }
  }),
  
  buildRoute('GET', '/manual3/:id', asyncHandler(async (req, res) => {
    return sendSuccessResponse(res, { 
      message: 'Manual route 3', 
      id: req.params.id 
    });
  }), {
    cors: 'analytics',
    validation: { params: ['id'] }
  })
];

applyRoutes(manualRouteRouter, routes);

// Example 49: Error handling patterns
const errorHandlingRouter = express.Router();

// Route that demonstrates proper error handling
errorHandlingRouter.get('/error-demo', asyncHandler(async (req, res) => {
  const { shouldError } = req.query;
  
  if (shouldError === 'true') {
    throw new Error('Simulated error');
  }
  
  return sendSuccessResponse(res, { message: 'No error occurred' });
}));

// Route that demonstrates validation error
errorHandlingRouter.post('/validation-demo',
  validateRequest({ body: ['requiredField'] }),
  asyncHandler(async (req, res) => {
    return sendSuccessResponse(res, { 
      message: 'Validation passed',
      data: req.body 
    });
  })
);

// Example 50: Complete service setup with route helpers
const completeServiceWithHelpers = express();

// Apply global middleware
completeServiceWithHelpers.use(getCorsMiddleware('standard'));
completeServiceWithHelpers.use(getRateLimitMiddleware('standard'));

// Health check routes
completeServiceWithHelpers.use('/health', healthRouter);

// Analytics routes
completeServiceWithHelpers.use('/analytics', analyticsRouterExample);

// Custom routes with helpers
completeServiceWithHelpers.use('/api/helpers', routeHelperRouter);
completeServiceWithHelpers.use('/api/paginated', paginatedRouter);
completeServiceWithHelpers.use('/api/dates', dateRangeRouter);
completeServiceWithHelpers.use('/api/manual', manualRouteRouter);
completeServiceWithHelpers.use('/api/errors', errorHandlingRouter);

// Global error handler
completeServiceWithHelpers.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Use standardized error response
  return sendErrorResponse(res, 500, 'Internal server error', err);
});

module.exports = {
  // ... existing exports
  routeHelperRouter,
  // userCrudRouter, // Commented out since User model may not exist
  healthRouter,
  analyticsRouterExample,
  customValidationRouter,
  paginatedRouter,
  dateRangeRouter,
  manualRouteRouter,
  errorHandlingRouter,
  completeServiceWithHelpers
};