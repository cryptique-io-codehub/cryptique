# Database Utilities

This directory contains centralized database utilities for MongoDB operations across the application.

## Structure

- `connectionHelpers.js` - Database connection management and configuration
- `queryHelpers.js` - Common database query patterns and operations
- `errorHandlers.js` - Standardized error handling for database operations
- `transactionHelpers.js` - MongoDB transaction management and atomic operations
- `modelOperations.js` - Model-specific database operations for common patterns
- `index.js` - Centralized exports for all database utilities

## Usage

### Basic Import

```javascript
const { database } = require('../utils');

// Or import specific modules
const { 
  connectToDatabase, 
  findWithPagination, 
  handleDatabaseError,
  userOperations 
} = require('../utils/database');
```

### Connection Management

```javascript
const { connectToDatabase, isConnected, closeConnection } = require('../utils/database');

// Connect to database
await connectToDatabase();

// Check connection status
if (isConnected()) {
  console.log('Database is connected');
}

// Close connection
await closeConnection();
```

### Query Operations

```javascript
const { findWithPagination, findByIdWithValidation, createWithValidation } = require('../utils/database');

// Paginated queries
const result = await findWithPagination(User, { isActive: true }, {
  page: 1,
  limit: 10,
  sort: { createdAt: -1 },
  populate: 'team'
});

// Find by ID with validation
const user = await findByIdWithValidation(User, userId, {
  populate: 'team'
});

// Create with validation
const newUser = await createWithValidation(User, userData);
```

### Error Handling

```javascript
const { handleDatabaseError, validateObjectId, createNotFoundError } = require('../utils/database');

try {
  validateObjectId(userId, 'userId');
  const user = await User.findById(userId);
  
  if (!user) {
    throw createNotFoundError('User', userId);
  }
} catch (error) {
  const errorResponse = handleDatabaseError(error, 'find user');
  return res.status(errorResponse.statusCode).json(errorResponse);
}
```

### Transaction Operations

```javascript
const { withTransaction, createWithRelated } = require('../utils/database');

// Simple transaction
const result = await withTransaction(async (session) => {
  const user = await User.create([userData], { session });
  const team = await Team.create([teamData], { session });
  return { user: user[0], team: team[0] };
});

// Create with related documents
const result = await createWithRelated(
  userData,
  User,
  [
    {
      model: Team,
      data: { ...teamData, mainDocRef: 'createdBy' }
    }
  ]
);
```

### Model-Specific Operations

```javascript
const { userOperations, transactionOperations, teamOperations } = require('../utils/database');

// User operations
const user = await userOperations.findByEmail(User, email);
const { user, team } = await userOperations.createWithTeam(User, Team, userData);
const verifiedUser = await userOperations.verifyOtp(User, email, otp);

// Transaction operations
const transactions = await transactionOperations.getByContract(Transaction, contractId, {
  page: 1,
  limit: 100,
  before: new Date()
});

const saveResult = await transactionOperations.bulkSave(
  Transaction, 
  contractId, 
  transactionData, 
  contractObjectId
);

// Team operations
const team = await teamOperations.checkUserAccess(Team, teamId, userId);
const subscriptionStatus = await teamOperations.getSubscriptionStatus(Team, teamId);
```

## Error Response Format

All database utilities return standardized error objects:

```javascript
{
  success: false,
  type: 'ValidationError' | 'DuplicateKeyError' | 'CastError' | 'ConnectionError' | 'TimeoutError',
  message: 'Human readable error message',
  details: {
    // Specific error details
  },
  statusCode: 400 | 404 | 409 | 500 | 503 | 504,
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Success Response Format

Successful operations return:

```javascript
{
  success: true,
  message: 'Operation successful',
  data: {
    // Result data
  },
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

## Configuration

Database utilities use environment variables for configuration:

- `MONGODB_URI` - MongoDB connection string (required)
- `MONGODB_MAX_POOL_SIZE` - Maximum connection pool size (default: 10)
- `MONGODB_MIN_POOL_SIZE` - Minimum connection pool size (default: 2)
- `NODE_ENV` - Environment (affects SSL settings)

## Best Practices

1. **Always use error handling utilities** for consistent error responses
2. **Validate ObjectIds** before database operations
3. **Use transactions** for operations that modify multiple documents
4. **Use pagination** for queries that might return large result sets
5. **Use model-specific operations** for common patterns to reduce code duplication
6. **Handle connection events** for production monitoring

## Migration Guide

### Before (Direct Mongoose Usage)

```javascript
// Old way - direct mongoose usage
const user = await User.findOne({ email });
if (!user) {
  return res.status(404).json({ message: 'User not found' });
}

const transactions = await Transaction.find({ contractId })
  .sort({ block_number: -1 })
  .limit(100);
```

### After (Using Database Utilities)

```javascript
// New way - using database utilities
const user = await userOperations.findByEmail(User, email);
if (!user) {
  const error = createNotFoundError('User', email);
  return res.status(error.statusCode).json(error);
}

const result = await transactionOperations.getByContract(Transaction, contractId, {
  limit: 100
});
```

This approach provides:
- Consistent error handling
- Built-in validation
- Standardized response formats
- Reduced code duplication
- Better maintainability