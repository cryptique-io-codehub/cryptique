# Validation Utilities

This directory contains centralized validation utilities for consistent input validation, authentication/authorization validation, and data format validation across all services.

## Overview

The validation utilities are designed to replace duplicate validation patterns found throughout the backend, server, and client services. They provide:

- **Input validation** for common data types (email, password, URL, ObjectId, etc.)
- **Authentication validation** for JWT tokens, API keys, and refresh tokens
- **Authorization validation** for team membership, resource ownership, and subscription access
- **Data format validation** for complex data structures (transactions, analytics events, etc.)
- **Bulk validation** for processing multiple items with consistent error handling

## Modules

### 1. Input Validators (`inputValidators.js`)

Basic input validation functions for common data types.

```javascript
const { validation } = require('../utils');

// Email validation
const emailResult = validation.inputValidators.validateEmail('user@example.com');
if (!emailResult.isValid) {
  console.error(emailResult.error); // "Invalid email format"
}

// Password validation with strength requirements
const passwordResult = validation.inputValidators.validatePassword('MyPassword123!', {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  userData: { email: 'user@example.com' } // Prevents using email in password
});

// URL validation
const urlResult = validation.inputValidators.validateUrl('https://example.com');

// MongoDB ObjectId validation
const idResult = validation.inputValidators.validateObjectId('507f1f77bcf86cd799439011');

// Ethereum address validation
const addressResult = validation.inputValidators.validateEthAddress('0x742d35Cc6634C0532925a3b8D');

// String length validation
const nameResult = validation.inputValidators.validateStringLength('John Doe', {
  minLength: 2,
  maxLength: 50,
  fieldName: 'Name'
});

// Number validation
const ageResult = validation.inputValidators.validateNumber('25', {
  min: 0,
  max: 120,
  integer: true,
  fieldName: 'Age'
});

// Array validation
const tagsResult = validation.inputValidators.validateArray(['tag1', 'tag2'], {
  minLength: 1,
  maxLength: 10,
  fieldName: 'Tags'
});

// Date validation
const dateResult = validation.inputValidators.validateDate('2023-12-01', {
  pastOnly: true,
  fieldName: 'Birth Date'
});
```

### 2. Authentication Validators (`authValidators.js`)

Authentication and authorization validation utilities.

```javascript
const { validation } = require('../utils');

// Extract and validate JWT token from request
const tokenResult = validation.authValidators.extractAndValidateToken(req);
if (tokenResult.isValid) {
  const token = tokenResult.token;
}

// Verify JWT token
const verifyResult = validation.authValidators.verifyJwtToken(token);
if (verifyResult.isValid) {
  const payload = verifyResult.payload;
  const userId = payload.userId;
}

// Validate refresh token
const refreshResult = await validation.authValidators.validateRefreshToken(
  refreshToken,
  RefreshTokenModel
);

// Validate API key
const apiKeyResult = validation.authValidators.validateApiKey(req, {
  headerName: 'x-api-key',
  envVarName: 'API_KEY'
});

// Validate team membership
const teamResult = await validation.authValidators.validateTeamMembership(
  userId,
  teamId,
  TeamModel,
  {
    requireRole: 'admin',
    requirePermissions: ['read', 'write']
  }
);

// Validate resource ownership
const ownershipResult = validation.authValidators.validateResourceOwnership(
  userId,
  resource,
  {
    ownerField: 'user',
    allowTeamAccess: true
  }
);

// Validate subscription access
const subscriptionResult = validation.authValidators.validateSubscriptionAccess(
  team,
  'advanced_analytics',
  {
    allowGracePeriod: true,
    gracePeriodDays: 7
  }
);

// Create authentication middleware
const authMiddleware = validation.authValidators.createAuthMiddleware({
  required: true,
  attachUser: true,
  userModel: UserModel
});

// Create team access middleware
const teamMiddleware = validation.authValidators.createTeamAccessMiddleware(TeamModel, {
  teamIdSource: 'params',
  teamIdField: 'teamId',
  requireRole: 'member'
});
```

### 3. Data Validators (`dataValidators.js`)

Complex data structure validation utilities.

```javascript
const { validation } = require('../utils');

// Validate pagination parameters
const paginationResult = validation.dataValidators.validatePaginationParams(req.query, {
  defaultPage: 1,
  defaultLimit: 10,
  maxLimit: 100
});
const { page, limit, skip } = paginationResult.values;

// Validate sorting parameters
const sortResult = validation.dataValidators.validateSortParams(req.query, {
  allowedFields: ['createdAt', 'name', 'status'],
  defaultSort: 'createdAt',
  defaultOrder: 'desc'
});
const { mongoSort } = sortResult.values;

// Validate date range
const dateRangeResult = validation.dataValidators.validateDateRangeParams(req.query, {
  maxRangeDays: 90,
  allowFuture: false
});

// Validate transaction data
const transactionResult = validation.dataValidators.validateTransactionData(transactionData, {
  requiredFields: ['tx_hash', 'from_address', 'contract_address'],
  validateAddresses: true,
  validateHash: true
});

// Validate analytics event
const eventResult = validation.dataValidators.validateAnalyticsEvent(eventData, {
  requiredFields: ['siteId', 'event'],
  maxEventNameLength: 100,
  maxPropertyValueLength: 1000
});

// Validate smart contract data
const contractResult = validation.dataValidators.validateSmartContractData(contractData, {
  requiredFields: ['address', 'chain', 'teamId'],
  validateAddress: true
});

// Validate bulk data
const bulkResult = validation.dataValidators.validateBulkData(
  transactions,
  (transaction) => validation.dataValidators.validateTransactionData(transaction),
  {
    maxItems: 1000,
    stopOnFirstError: false
  }
);
```

## Migration Examples

### Before (Duplicate Validation Logic)

```javascript
// Multiple files with similar email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
  return res.status(400).json({ message: 'Invalid email' });
}

// Multiple files with similar password validation
if (!password || password.length < 8) {
  return res.status(400).json({ message: 'Password too short' });
}

// Multiple files with similar token extraction
const token = req.headers['authorization']?.split(' ')[1];
if (!token) {
  return res.status(403).json({ message: 'No token provided' });
}
```

### After (Centralized Validation)

```javascript
const { validation } = require('../utils');
const { errorHandlers } = require('../utils/api');

// Centralized validation with consistent error handling
const emailResult = validation.inputValidators.validateEmail(req.body.email);
if (!emailResult.isValid) {
  throw new errorHandlers.ValidationError(emailResult.error, { field: 'email' });
}

const passwordResult = validation.inputValidators.validatePassword(req.body.password);
if (!passwordResult.isValid) {
  throw new errorHandlers.ValidationError(passwordResult.error, { field: 'password' });
}

const tokenResult = validation.authValidators.extractAndValidateToken(req);
if (!tokenResult.isValid) {
  throw new errorHandlers.AuthenticationError(tokenResult.error);
}
```

### Before (Manual Parameter Validation)

```javascript
// Multiple route handlers with similar parameter extraction
const page = parseInt(req.query.page) || 1;
const limit = Math.min(parseInt(req.query.limit) || 10, 100);
const skip = (page - 1) * limit;

const sortBy = req.query.sortBy || 'createdAt';
const sortOrder = req.query.sortOrder || 'desc';
if (!['asc', 'desc'].includes(sortOrder)) {
  return res.status(400).json({ message: 'Invalid sort order' });
}
```

### After (Centralized Parameter Validation)

```javascript
const { validation } = require('../utils');

const paginationResult = validation.dataValidators.validatePaginationParams(req.query);
const sortResult = validation.dataValidators.validateSortParams(req.query, {
  allowedFields: ['createdAt', 'name', 'status']
});

if (!sortResult.isValid) {
  throw new errorHandlers.ValidationError('Invalid sort parameters', {
    errors: sortResult.errors
  });
}

const { page, limit, skip } = paginationResult.values;
const { mongoSort } = sortResult.values;
```

## Validation Result Format

All validation functions return a consistent result format:

```javascript
// Success result
{
  isValid: true,
  value: "processed_value" // Normalized/processed value
}

// Error result
{
  isValid: false,
  error: "Error message",
  code: "ERROR_CODE", // Machine-readable error code
  details: {} // Additional error details (optional)
}

// Bulk validation result
{
  isValid: true/false,
  errors: ["error1", "error2"], // Array of error messages
  values: {}, // Processed values object
  validItems: [], // Valid items (for bulk operations)
  invalidItems: [] // Invalid items with errors (for bulk operations)
}
```

## Error Codes

Common error codes returned by validation functions:

### Input Validation
- `EMAIL_REQUIRED`, `EMAIL_INVALID_FORMAT`, `EMAIL_TOO_LONG`
- `PASSWORD_REQUIRED`, `PASSWORD_TOO_SHORT`, `PASSWORD_WEAK`, `PASSWORD_COMMON`
- `URL_REQUIRED`, `URL_INVALID_FORMAT`, `URL_INVALID_PROTOCOL`
- `OBJECTID_REQUIRED`, `OBJECTID_INVALID_FORMAT`
- `STRING_REQUIRED`, `STRING_TOO_SHORT`, `STRING_TOO_LONG`
- `NUMBER_REQUIRED`, `NUMBER_INVALID`, `NUMBER_TOO_SMALL`, `NUMBER_TOO_LARGE`

### Authentication Validation
- `AUTH_HEADER_MISSING`, `AUTH_HEADER_INVALID_FORMAT`, `TOKEN_EMPTY`
- `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_MALFORMED`, `TOKEN_NOT_ACTIVE`
- `REFRESH_TOKEN_REQUIRED`, `REFRESH_TOKEN_INVALID`
- `API_KEY_REQUIRED`, `API_KEY_INVALID`
- `USER_ID_REQUIRED`, `TEAM_ID_REQUIRED`, `TEAM_NOT_FOUND`, `NOT_TEAM_MEMBER`

### Data Validation
- `ARRAY_REQUIRED`, `ARRAY_TOO_SHORT`, `ARRAY_TOO_LONG`, `ARRAY_ITEM_INVALID`
- `DATE_REQUIRED`, `DATE_INVALID`, `DATE_NOT_FUTURE`, `DATE_NOT_PAST`

## Best Practices

1. **Always validate input**: Use validation utilities for all user input
2. **Handle validation errors consistently**: Use the error handlers from the API utilities
3. **Provide meaningful error messages**: Include field names and specific requirements
4. **Validate early**: Perform validation at the beginning of route handlers
5. **Use appropriate validation options**: Configure validators based on your specific needs
6. **Combine validations**: Use multiple validators for complex validation requirements
7. **Log validation failures**: Use the error logging utilities for debugging

## Testing

The validation utilities include comprehensive error handling and detailed error messages. Test your validation logic thoroughly:

```javascript
// Test validation functions
const result = validation.inputValidators.validateEmail('invalid-email');
console.log(result.isValid); // false
console.log(result.error);   // "Invalid email format"
console.log(result.code);    // "EMAIL_INVALID_FORMAT"

// Test with options
const passwordResult = validation.inputValidators.validatePassword('weak', {
  minLength: 8
});
console.log(passwordResult.error); // "Password must be at least 8 characters long"
```

## Dependencies

- `jsonwebtoken`: JWT token verification
- Custom error classes from `../api/errorHandlers`

## Contributing

When adding new validation utilities:

1. Follow the consistent result format
2. Include comprehensive error codes
3. Add JSDoc documentation
4. Include usage examples
5. Update this README
6. Ensure backward compatibility