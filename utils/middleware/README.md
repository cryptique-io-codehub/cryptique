# Middleware Utilities

This directory contains centralized middleware configurations and utilities used across the application.

## CORS Configuration (`corsConfig.js`)

Provides standardized CORS configurations for different types of routes and services.

### Available Configurations

- **`standard`** - Default CORS for most API routes with credential support
- **`sdk`** - Permissive CORS for public SDK usage (no credentials)
- **`auth`** - Strict CORS for authentication endpoints with full header support
- **`analytics`** - Specific CORS configuration for analytics endpoints
- **`development`** - Very permissive CORS for local development

### Basic Usage

```javascript
const { getCorsMiddleware } = require('./utils/middleware/corsConfig');

// Use standard CORS
app.use(getCorsMiddleware('standard'));

// Use SDK CORS for public endpoints
app.use('/api/sdk', getCorsMiddleware('sdk'));

// Use auth CORS for authentication
app.use('/api/auth', getCorsMiddleware('auth'));
```

### Custom Configuration

```javascript
// Override default settings
app.use(getCorsMiddleware('standard', {
  origin: ['https://custom-domain.com'],
  methods: ['GET', 'POST']
}));
```

### Manual CORS Headers

For cases where you need manual control over CORS headers:

```javascript
const { setCorsHeaders } = require('./utils/middleware/corsConfig');

router.use(setCorsHeaders('analytics'));
```

### Environment-Aware CORS

Automatically uses development-friendly CORS in development:

```javascript
const { getEnvironmentCors } = require('./utils/middleware/corsConfig');

app.use(getEnvironmentCors('standard'));
```

## Configuration Details

### Standard Configuration
- **Origins**: Cryptique domains + localhost in development
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: Content-Type, Authorization, Accept, Origin, X-Requested-With
- **Credentials**: Enabled
- **Max Age**: 24 hours

### SDK Configuration
- **Origins**: Permissive (allows embedding)
- **Methods**: GET, POST, OPTIONS
- **Headers**: Standard headers + x-cryptique-site-id
- **Credentials**: Disabled (for security with permissive origins)
- **Max Age**: 24 hours

### Auth Configuration
- **Origins**: Strict (Cryptique domains only)
- **Methods**: All standard methods + PATCH
- **Headers**: Extended headers for auth flows
- **Credentials**: Enabled
- **Exposed Headers**: Set-Cookie
- **Max Age**: 24 hours

### Analytics Configuration
- **Origins**: Cryptique domains + localhost
- **Methods**: GET, POST, OPTIONS
- **Headers**: Standard headers
- **Credentials**: Enabled
- **Max Age**: 24 hours

### Development Configuration
- **Origins**: Wildcard (*)
- **Methods**: All methods
- **Headers**: All headers
- **Credentials**: Disabled (can't use with wildcard)
- **Max Age**: 24 hours

## Migration Guide

### From Backend Service

Replace this:
```javascript
// Old backend/index.js
const mainCorsOptions = {
  origin: function(origin, callback) {
    // Complex origin logic...
  },
  // ... other options
};
app.use(cors(mainCorsOptions));
```

With this:
```javascript
// New approach
const { getCorsMiddleware } = require('./utils/middleware/corsConfig');
app.use(getCorsMiddleware('standard'));
```

### From Server Service

Replace this:
```javascript
// Old server/index.js
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.cryptique.io'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

With this:
```javascript
// New approach
const { getEnvironmentCors } = require('./utils/middleware/corsConfig');
app.use(getEnvironmentCors('standard'));
```

### From Route-Specific CORS

Replace this:
```javascript
// Old route-specific CORS
const corsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  // ... other options
};
router.use(cors(corsOptions));
```

With this:
```javascript
// New approach
const { getCorsMiddleware } = require('../utils/middleware/corsConfig');
router.use(getCorsMiddleware('analytics')); // or appropriate type
```

## Benefits

1. **Consistency** - All CORS configurations follow the same patterns
2. **Maintainability** - Single place to update CORS logic
3. **Security** - Standardized security practices across all endpoints
4. **Flexibility** - Easy to customize for specific needs
5. **Environment Awareness** - Automatic development vs production handling
6. **Documentation** - Clear examples and usage patterns

## Testing

The CORS configuration includes proper error handling and validation. Test your endpoints with:

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/endpoint \
  -H "Origin: https://app.cryptique.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# Test actual request
curl -X POST http://localhost:3000/api/endpoint \
  -H "Origin: https://app.cryptique.io" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Rate Limiting Configuration (`rateLimitConfig.js`)

Provides standardized rate limiting configurations for different types of routes and services.

### Available Configurations

- **`standard`** - Default rate limiting for most API routes
- **`auth`** - Strict rate limiting for authentication endpoints
- **`analytics`** - Moderate rate limiting for analytics endpoints
- **`sdk`** - Permissive rate limiting for public SDK usage
- **`sensitive`** - Very strict rate limiting for sensitive operations
- **`loginFailure`** - Tracks failed login attempts specifically
- **`health`** - Very permissive rate limiting for health checks
- **`development`** - Very permissive rate limiting for local development

### Basic Usage

```javascript
const { getRateLimitMiddleware } = require('./utils/middleware/rateLimitConfig');

// Use standard rate limiting
app.use(getRateLimitMiddleware('standard'));

// Use auth rate limiting for authentication
app.use('/api/auth', getRateLimitMiddleware('auth'));

// Use SDK rate limiting for public endpoints
app.use('/api/sdk', getRateLimitMiddleware('sdk'));
```

### Custom Configuration

```javascript
// Override default settings
app.use(getRateLimitMiddleware('standard', {
  max: 200, // Custom limit
  windowMs: 10 * 60 * 1000 // 10 minutes
}));

// Create completely custom rate limiter
const { createCustomRateLimit } = require('./utils/middleware/rateLimitConfig');
app.use(createCustomRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: 'Custom rate limit exceeded'
}));
```

### Environment-Aware Rate Limiting

Automatically uses development-friendly rate limiting in development:

```javascript
const { getEnvironmentRateLimit } = require('./utils/middleware/rateLimitConfig');

app.use(getEnvironmentRateLimit('standard'));
```

### Multiple Rate Limiters

Create different rate limiters for different tiers:

```javascript
const { createRateLimiters } = require('./utils/middleware/rateLimitConfig');

const rateLimiters = createRateLimiters();

app.use('/api/public', rateLimiters.standard);
app.use('/api/auth', rateLimiters.auth);
app.use('/api/sdk', rateLimiters.sdk);
app.use('/api/admin', rateLimiters.sensitive);
```

### Redis Support

For production environments with multiple servers:

```javascript
const rateLimiters = createRateLimiters({
  redis: process.env.REDIS_URL
});

app.use('/api', rateLimiters.standard);
```

## Rate Limiting Details

### Standard Configuration
- **Window**: 15 minutes
- **Limit**: 100 requests per window
- **Key**: IP address
- **Headers**: Standard rate limit headers included

### Auth Configuration
- **Window**: 1 hour
- **Limit**: 20 requests per window (production)
- **Key**: IP address
- **Purpose**: Prevent brute force attacks

### SDK Configuration
- **Window**: 1 minute
- **Limit**: 100 requests per minute (production)
- **Key**: Site ID or IP address
- **Purpose**: Allow reasonable SDK usage while preventing abuse

### Analytics Configuration
- **Window**: 1 minute
- **Limit**: 30 requests per minute (production)
- **Key**: IP address
- **Purpose**: Balance analytics access with server protection

### Sensitive Configuration
- **Window**: 1 hour
- **Limit**: 10 requests per hour (production)
- **Key**: IP address
- **Purpose**: Protect sensitive operations like password resets

### Login Failure Configuration
- **Window**: 1 hour
- **Limit**: 5 failed attempts per hour
- **Key**: IP address
- **Behavior**: Only counts failed login attempts

## Migration Guide

### From Backend Service

Replace this:
```javascript
// Old backend/middleware/rateLimiter.js
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  // ... other options
});
app.use(apiLimiter);
```

With this:
```javascript
// New approach
const { getRateLimitMiddleware } = require('./utils/middleware/rateLimitConfig');
app.use(getRateLimitMiddleware('standard'));
```

### From Server Service

Replace this:
```javascript
// Old server/middleware/rateLimiter.js
const rateLimiters = createRateLimiter();
app.use('/api/', rateLimiters.standard);
```

With this:
```javascript
// New approach
const { createRateLimiters } = require('./utils/middleware/rateLimitConfig');
const rateLimiters = createRateLimiters();
app.use('/api/', rateLimiters.standard);
```

## Troubleshooting

### Common Issues

1. **"CORS policy violation"** - Check if the origin is in the allowed origins list
2. **Credentials not working** - Ensure credentials are enabled and origin is not wildcard
3. **Preflight failures** - Check if the requested method and headers are allowed
4. **Development issues** - Use `getEnvironmentCors()` for automatic development handling
5. **Rate limit too strict** - Use `getEnvironmentRateLimit()` for development-friendly limits
6. **Rate limit not working** - Check if the middleware is applied before your routes
7. **Redis connection issues** - Falls back to memory store automatically

### Debug Mode

Set `DEBUG=cors` environment variable to see detailed CORS logs:

```bash
DEBUG=cors npm start
```

For rate limiting debug information, check the response headers:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the rate limit resets

## Authentication Middleware (`authMiddleware.js`)

Provides standardized authentication middleware for different types of routes and services.

### Available Configurations

- **`standard`** - Required JWT authentication for most protected routes
- **`optional`** - Optional JWT authentication (allows unauthenticated access)
- **`strict`** - Required JWT authentication with full user object attachment
- **`admin`** - Required JWT authentication with admin role requirement
- **`apiKey`** - API key authentication for service-to-service communication
- **`sdk`** - SDK authentication using site ID for identification

### Basic Usage

```javascript
const { getAuthMiddleware } = require('./utils/middleware/authMiddleware');

// Standard JWT authentication
app.use('/api/protected', getAuthMiddleware('standard'));

// Optional authentication
app.use('/api/public', getAuthMiddleware('optional'));

// Admin authentication
app.use('/api/admin', getAuthMiddleware('admin', {}, UserModel));
```

### Custom Configuration

```javascript
// Override default settings
app.use(getAuthMiddleware('standard', {
  jwtConfig: {
    secret: process.env.CUSTOM_JWT_SECRET,
    clockTolerance: 60
  },
  errorMessages: {
    noToken: 'Custom authentication required message'
  }
}));
```

### Multiple Authentication Middleware

Create different authentication middleware for different tiers:

```javascript
const { createAuthMiddlewares } = require('./utils/middleware/authMiddleware');

const authMiddlewares = createAuthMiddlewares(UserModel);

app.use('/api/public', authMiddlewares.optional);
app.use('/api/protected', authMiddlewares.standard);
app.use('/api/admin', authMiddlewares.admin);
app.use('/api/sdk', authMiddlewares.sdk);
```

### Team Access Middleware

For team-based access control:

```javascript
const { createTeamAccessMiddleware } = require('./utils/middleware/authMiddleware');

// First authenticate the user
app.use('/api/teams', getAuthMiddleware('standard', {}, UserModel));

// Then check team access
app.use('/api/teams/:teamId', createTeamAccessMiddleware(TeamModel, {
  teamIdSource: 'params',
  teamIdField: 'teamId',
  requireRole: 'admin' // Optional role requirement
}));
```

### Resource Ownership Middleware

For resource-based access control:

```javascript
const { createResourceOwnershipMiddleware } = require('./utils/middleware/authMiddleware');

const fetchProject = async (projectId) => {
  return await ProjectModel.findById(projectId);
};

app.use('/api/projects/:id', createResourceOwnershipMiddleware(fetchProject, {
  resourceIdSource: 'params',
  resourceIdField: 'id',
  ownerField: 'user'
}));
```

### Subscription Access Middleware

For subscription-based feature access:

```javascript
const { createSubscriptionAccessMiddleware } = require('./utils/middleware/authMiddleware');

app.use('/api/premium', createSubscriptionAccessMiddleware('premium_features', {
  allowGracePeriod: true,
  gracePeriodDays: 7
}));
```

## Authentication Details

### Standard Configuration
- **Type**: JWT Bearer token
- **Header**: Authorization: Bearer <token>
- **Attaches**: `req.userId`, `req.userEmail`, `req.tokenPayload`
- **Required**: Yes

### Optional Configuration
- **Type**: JWT Bearer token
- **Header**: Authorization: Bearer <token>
- **Attaches**: `req.userId`, `req.userEmail`, `req.tokenPayload` (if token provided)
- **Required**: No

### Strict Configuration
- **Type**: JWT Bearer token with user object
- **Header**: Authorization: Bearer <token>
- **Attaches**: `req.userId`, `req.userEmail`, `req.tokenPayload`, `req.user`
- **Required**: Yes
- **Additional**: Fetches and attaches full user object

### Admin Configuration
- **Type**: JWT Bearer token with admin role check
- **Header**: Authorization: Bearer <token>
- **Attaches**: `req.userId`, `req.userEmail`, `req.tokenPayload`, `req.user`
- **Required**: Yes
- **Role Check**: Requires admin role

### API Key Configuration
- **Type**: API key authentication
- **Header**: x-api-key: <key>
- **Attaches**: `req.apiKey`, `req.authenticated`
- **Required**: Yes

### SDK Configuration
- **Type**: Site ID authentication
- **Header**: x-cryptique-site-id: <siteId>
- **Attaches**: `req.siteId`, `req.authenticated`, `req.site` (if validation enabled)
- **Required**: Yes

## Migration Guide

### From Backend Auth Middleware

Replace this:
```javascript
// Old backend/middleware/auth.js
const { verifyToken } = require('../middleware/auth');
router.use(verifyToken);
```

With this:
```javascript
// New approach
const { getAuthMiddleware } = require('./utils/middleware/authMiddleware');
router.use(getAuthMiddleware('standard'));
```

### From Duplicate Auth Files

Replace multiple auth middleware files with centralized configuration:

```javascript
// Instead of importing from multiple files
const { getAuthMiddleware } = require('./utils/middleware/authMiddleware');

// Use appropriate configuration type
app.use('/api/auth', getAuthMiddleware('standard'));
```

## Benefits

1. **Consistency** - All authentication follows the same patterns
2. **Security** - Standardized JWT validation and error handling
3. **Flexibility** - Multiple authentication types for different use cases
4. **Maintainability** - Single place to update authentication logic
5. **Error Handling** - Consistent error responses across all endpoints
6. **Team Support** - Built-in team access and resource ownership validation
7. **Subscription Support** - Built-in subscription-based feature access
## 
Route Helpers (`routeHelpers.js`)

Provides utility functions for common route patterns and operations.

### Available Helpers

- **`asyncHandler`** - Wraps async route handlers to catch errors
- **`sendErrorResponse`** - Standardized error response formatting
- **`sendSuccessResponse`** - Standardized success response formatting
- **`validateRequest`** - Request validation middleware factory
- **`dbOperation`** - Database operation wrapper with error handling
- **`createCacheKey`** - Cache key generator
- **`createRoute`** - Route middleware factory
- **`createHealthCheck`** - Health check route factory
- **`handlePagination`** - Pagination helper
- **`validateDateRange`** - Date range validation helper

### Basic Usage

```javascript
const { 
  asyncHandler, 
  sendSuccessResponse, 
  createRoute 
} = require('./utils/middleware/routeHelpers');

// Async error handling
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  return sendSuccessResponse(res, { users });
}));

// Route with multiple middleware
const protectedRoute = createRoute({
  auth: 'standard',
  rateLimit: 'default',
  cors: 'analytics',
  validation: { body: ['name', 'email'] }
});

router.post('/users', ...protectedRoute(asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  return sendSuccessResponse(res, { user }, 'User created', 201);
})));
```

## Route Patterns (`routePatterns.js`)

Provides pre-built route handlers for common operations.

### Available Patterns

- **`createGetByIdHandler`** - Generic GET by ID handler
- **`createGetListHandler`** - Generic GET list handler with pagination
- **`createPostHandler`** - Generic POST create handler
- **`createUpdateHandler`** - Generic PUT/PATCH update handler
- **`createDeleteHandler`** - Generic DELETE handler
- **`createLoginHandler`** - Standardized login handler
- **`createTeamMemberHandler`** - Team member management handler
- **`createAnalyticsHandler`** - Analytics data handler with caching

### Basic Usage

```javascript
const { 
  createGetByIdHandler, 
  createPostHandler 
} = require('./utils/middleware/routePatterns');

// Generic CRUD handlers
router.get('/users/:id', createGetByIdHandler(User, {
  populate: 'team',
  select: '-password'
}));

router.post('/users', createPostHandler(User, {
  beforeSave: async (data, req) => {
    data.createdBy = req.userId;
    return data;
  }
}));
```

## Route Factory (`routeFactory.js`)

Provides factory functions for creating complete routers.

### Available Factories

- **`createCrudRouter`** - Complete CRUD router for a model
- **`createAuthRouter`** - Authentication router
- **`createTeamRouter`** - Team management router
- **`createAnalyticsRouter`** - Analytics router with caching
- **`createHealthRouter`** - Health check router
- **`buildRoute`** - Custom route builder
- **`applyRoutes`** - Apply routes to a router

### Basic Usage

```javascript
const { 
  createCrudRouter, 
  createHealthRouter 
} = require('./utils/middleware/routeFactory');

// Complete CRUD router
const userRouter = createCrudRouter(User, {
  auth: 'standard',
  select: '-password',
  permissions: {
    create: { auth: 'admin' },
    delete: { auth: 'admin' }
  }
});

app.use('/api/users', userRouter);

// Health check router
const healthRouter = createHealthRouter({
  database: async () => {
    await mongoose.connection.db.admin().ping();
    return { status: 'connected' };
  }
});

app.use('/health', healthRouter);
```

## Migration Guide for Route Patterns

### From Manual Route Setup

**Before:**
```javascript
router.post('/users', 
  cors(corsOptions),
  rateLimit,
  authMiddleware,
  async (req, res) => {
    try {
      if (!req.body.name || !req.body.email) {
        return res.status(400).json({ error: 'Name and email required' });
      }
      
      const user = await User.create(req.body);
      res.status(201).json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);
```

**After:**
```javascript
const createUserRoute = createRoute({
  auth: 'standard',
  rateLimit: 'default',
  cors: 'standard',
  validation: { body: ['name', 'email'] }
});

router.post('/users', ...createUserRoute(asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  return sendSuccessResponse(res, { user }, 'User created successfully', 201);
})));
```

### From Manual CRUD Routes

**Before:** Multiple route definitions with duplicate patterns

**After:**
```javascript
const userRouter = createCrudRouter(User, {
  auth: 'standard',
  select: '-password'
});
app.use('/api/users', userRouter);
```

## Common Patterns Extracted

The route helpers and patterns extract these common patterns found across the codebase:

1. **Error Handling**: Consistent try/catch blocks with standardized error responses
2. **Authentication**: Applying auth middleware to protected routes
3. **Rate Limiting**: Applying rate limits to different types of endpoints
4. **CORS**: Configuring CORS for different endpoint types
5. **Validation**: Checking for required parameters in requests
6. **Response Formatting**: Consistent JSON response structures
7. **Database Operations**: Standardized database query patterns
8. **Caching**: Cache key generation and cache wrapping
9. **Pagination**: Standardized pagination parameters and responses
10. **Team Access**: Team membership and role validation
11. **Subscription Checks**: Plan-based feature access

## Benefits of Route Helpers

1. **Consistency**: Standardized patterns across all routes
2. **Maintainability**: Centralized route logic
3. **Reusability**: Common patterns extracted into reusable functions
4. **Error Handling**: Consistent error handling and response formatting
5. **Security**: Standardized authentication and rate limiting
6. **Performance**: Built-in caching and optimization patterns
7. **Developer Experience**: Simplified route creation with less boilerplate
8. **Testing**: Easier to test standardized patterns
9. **Documentation**: Self-documenting route patterns

## Complete Example

Here's how to set up a complete service using all the middleware utilities:

```javascript
const express = require('express');
const {
  getCorsMiddleware,
  getRateLimitMiddleware,
  getAuthMiddleware,
  createCrudRouter,
  createHealthRouter,
  createAnalyticsRouter
} = require('./utils/middleware');

const app = express();

// Global middleware
app.use(express.json());
app.use(getCorsMiddleware('standard'));
app.use(getRateLimitMiddleware('standard'));

// Health check
app.use('/health', createHealthRouter({
  database: async () => {
    await mongoose.connection.db.admin().ping();
    return { status: 'connected' };
  }
}));

// Authentication routes
const authRouter = express.Router();
authRouter.use(getRateLimitMiddleware('auth'));
authRouter.post('/login', loginHandler);
authRouter.post('/register', registerHandler);
app.use('/auth', authRouter);

// Protected API routes
const apiRouter = express.Router();
apiRouter.use(getAuthMiddleware('standard'));

// CRUD routes
apiRouter.use('/users', createCrudRouter(User, {
  select: '-password',
  permissions: {
    create: { auth: 'admin' },
    delete: { auth: 'admin' }
  }
}));

// Analytics routes
apiRouter.use('/analytics', createAnalyticsRouter({
  chartDataFetcher: getChartData,
  userJourneysFetcher: getUserJourneys
}));

app.use('/api', apiRouter);

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(3000);
```

This setup provides:
- Standardized CORS and rate limiting
- Consistent authentication across all routes
- Automatic CRUD operations for models
- Built-in health checks
- Analytics endpoints with caching
- Proper error handling
- Minimal boilerplate code