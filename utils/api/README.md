# API Utilities

This directory contains centralized API utilities for consistent HTTP client configurations, response formatting, error handling, and common request/response patterns across all services.

## Overview

The API utilities are designed to replace duplicate code patterns found throughout the backend, server, and client services. They provide:

- **Standardized HTTP clients** with retry logic, timeout management, and error handling
- **Consistent response formatting** for success, error, and paginated responses
- **Centralized error handling** with custom error classes and middleware
- **Common configuration helpers** for CORS, rate limiting, and middleware setup
- **Request processing utilities** for parameter extraction, validation, and filtering

## Modules

### 1. HTTP Client (`httpClient.js`)

Provides configured axios instances with built-in retry logic, timeout management, and request/response interceptors.

```javascript
const { httpClient } = require('../utils/api');

// Create a general API client
const client = httpClient.createApiClient({
  baseURL: 'https://api.example.com',
  defaultTimeout: 15000,
  retryCount: 3
});

// Create service-specific clients
const backendClient = httpClient.createBackendClient();
const serverClient = httpClient.createServerClient();
const authClient = httpClient.createAuthenticatedClient('jwt-token');

// Use different operation types with appropriate timeouts
await client.quick('/health');           // 5s timeout
await client.standard('/api/data');      // 15s timeout
await client.complex('/api/reports');    // 30s timeout
await client.upload('/api/files', data); // 60s timeout
```

### 2. Response Helpers (`responseHelpers.js`)

Standardized response formatting functions for consistent API responses.

```javascript
const { responseHelpers } = require('../utils/api');

// Success responses
responseHelpers.sendSuccess(res, data, 'Operation successful');
responseHelpers.sendPaginated(res, items, { page: 1, limit: 10, total: 100 });

// Error responses
responseHelpers.sendError(res, 'Not found', 404);
responseHelpers.sendResponse(res, responseHelpers.createValidationErrorResponse(errors));

// Async error handling
const handler = responseHelpers.asyncHandler(async (req, res) => {
  const data = await someAsyncOperation();
  responseHelpers.sendSuccess(res, data);
});
```

### 3. Error Handlers (`errorHandlers.js`)

Custom error classes and centralized error handling utilities.

```javascript
const { errorHandlers } = require('../utils/api');

// Custom error classes
throw new errorHandlers.ValidationError('Invalid input', { field: 'email' });
throw new errorHandlers.AuthenticationError('Invalid token');
throw new errorHandlers.NotFoundError('User');

// Error handling utilities
const authError = errorHandlers.handleAuthError(jwtError);
const dbError = errorHandlers.handleDatabaseError(mongoError);

// Express error middleware
app.use(errorHandlers.errorMiddleware);

// Async error wrapper
const safeHandler = errorHandlers.asyncErrorHandler(async (req, res) => {
  // Your async route logic here
});
```

### 4. Configuration Helpers (`configHelpers.js`)

Common configuration utilities for CORS, rate limiting, and middleware setup.

```javascript
const { configHelpers } = require('../utils/api');

// CORS configuration
const corsConfig = configHelpers.createCorsConfig({
  origins: ['http://localhost:3000', 'https://app.example.com']
});
app.use(cors(corsConfig));

// Rate limiting
const rateLimitConfig = configHelpers.createRateLimitConfig({ max: 100 });
const authRateLimit = configHelpers.createAuthRateLimitConfig();
app.use('/api/', rateLimit(rateLimitConfig));
app.use('/api/auth/', rateLimit(authRateLimit));

// API key validation
const apiKeyValidator = configHelpers.createApiKeyValidator({
  envVarName: 'API_KEY'
});
app.use('/api/admin/', apiKeyValidator);

// Timeout middleware
app.use('/api/reports/', configHelpers.createTimeoutMiddleware('complex'));
```

### 5. Request Helpers (`requestHelpers.js`)

Common request processing utilities for parameter extraction and validation.

```javascript
const { requestHelpers } = require('../utils/api');

// Parameter extraction
const { email, password } = requestHelpers.extractRequiredParams(req, ['email', 'password']);
const { page, limit } = requestHelpers.extractPaginationParams(req);
const filters = requestHelpers.extractFilterParams(req, {
  allowedFields: ['name', 'status'],
  dateFields: ['createdAt']
});

// Validation helpers
const team = await requestHelpers.validateTeamAccess(req, teamId, TeamModel);
const siteId = requestHelpers.extractSiteId(req);
requestHelpers.validateUrl(req.body.callbackUrl, 'Callback URL');

// Context creation
const context = requestHelpers.createRequestContext(req);
```

## Migration Examples

### Before (Duplicate CORS Configuration)

```javascript
// backend/index.js
const corsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// server/index.js
const corsConfig = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### After (Centralized Configuration)

```javascript
// Both services
const { configHelpers } = require('../utils/api');
const corsConfig = configHelpers.createCorsConfig();
app.use(cors(corsConfig));
```

### Before (Duplicate Response Patterns)

```javascript
// Multiple files with similar patterns
res.status(400).json({ message: 'Validation failed', errors });
res.status(404).json({ message: 'Team not found' });
res.status(200).json({ message: 'Success', data: result });
```

### After (Standardized Responses)

```javascript
const { responseHelpers } = require('../utils/api');

responseHelpers.sendResponse(res, responseHelpers.createValidationErrorResponse(errors));
responseHelpers.sendResponse(res, responseHelpers.createNotFoundResponse('Team'));
responseHelpers.sendSuccess(res, result);
```

### Before (Duplicate Error Handling)

```javascript
// Multiple middleware files with similar auth error handling
if (!token) {
  return res.status(403).json({ message: 'No token provided' });
}
jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
  if (err) {
    return res.status(401).json({ message: 'Failed to authenticate token' });
  }
  // ...
});
```

### After (Centralized Error Handling)

```javascript
const { errorHandlers } = require('../utils/api');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
      throw new errorHandlers.AuthenticationError('No token provided');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(errorHandlers.handleAuthError(error));
  }
};
```

## Best Practices

1. **Use async handlers**: Always wrap async route handlers with `responseHelpers.asyncHandler()` or `errorHandlers.asyncErrorHandler()`

2. **Throw custom errors**: Use the provided error classes instead of generic Error objects

3. **Validate parameters early**: Use request helpers to extract and validate parameters at the beginning of route handlers

4. **Consistent responses**: Use response helpers for all API responses to maintain consistency

5. **Configure once**: Use configuration helpers to set up CORS, rate limiting, and other middleware consistently across services

6. **Log errors properly**: The error middleware automatically logs errors with appropriate context

## Testing

The utilities include comprehensive error handling and logging. In development mode, detailed error information is provided, while production mode returns sanitized error messages.

To test the utilities:

```javascript
// Test error handling
try {
  throw new errorHandlers.ValidationError('Test error');
} catch (error) {
  console.log(error.statusCode); // 422
  console.log(error.code);       // 'VALIDATION_ERROR'
}

// Test request helpers
const mockReq = { body: { email: 'test@example.com' } };
const { email } = requestHelpers.extractRequiredParams(mockReq, ['email']);
```

## Dependencies

- `axios`: HTTP client library
- `express`: Web framework (for middleware)
- `cors`: CORS middleware
- `express-rate-limit`: Rate limiting middleware

## Contributing

When adding new API utilities:

1. Follow the existing patterns and naming conventions
2. Add comprehensive JSDoc documentation
3. Include error handling and validation
4. Update the examples and README
5. Ensure backward compatibility