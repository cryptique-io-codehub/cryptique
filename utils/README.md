# Centralized Utility Library

This directory contains a centralized utility library that provides reusable functions and configurations across the entire application. The library is organized into logical modules to promote code reuse, consistency, and maintainability.

## Directory Structure

```
utils/
├── api/                    # API utilities and HTTP client configurations
│   ├── httpClient.js      # Centralized HTTP client with retry logic
│   ├── responseHelpers.js # Standard API response formatting
│   ├── errorHandlers.js   # Common error handling patterns
│   └── index.js           # API utilities entry point
├── validation/            # Input validation and authentication helpers
│   ├── inputValidators.js # Common input validation functions
│   ├── authValidators.js  # Authentication-specific validations
│   ├── dataValidators.js  # Data format validations
│   └── index.js           # Validation utilities entry point
├── database/              # Database operations and connection management
│   ├── connectionHelpers.js # Database connection utilities
│   ├── queryHelpers.js    # Common database query patterns
│   ├── migrationHelpers.js # Database migration utilities
│   └── index.js           # Database utilities entry point
├── middleware/            # Middleware configurations
│   ├── corsConfig.js      # Centralized CORS configuration
│   ├── rateLimitConfig.js # Rate limiting configurations
│   ├── authMiddleware.js  # Authentication middleware
│   └── index.js           # Middleware utilities entry point
├── common/                # General helper functions and constants
│   ├── constants.js       # Application constants
│   ├── formatters.js      # Data formatting utilities
│   ├── helpers.js         # General helper functions
│   └── index.js           # Common utilities entry point
├── analysis/              # Code analysis utilities (existing)
└── index.js               # Main entry point for all utilities
```

## Usage

### Import the entire utility library:
```javascript
const utils = require('./utils');

// Use API utilities
const client = utils.api.httpClient.createApiClient();

// Use validation utilities
const isValid = utils.validation.inputValidators.validateEmail(email);

// Use database utilities
const result = await utils.database.queryHelpers.findWithRetry(Model, query);
```

### Import specific modules:
```javascript
const { api, validation, database } = require('./utils');

// Or import individual utility files
const { httpClient } = require('./utils/api');
const { inputValidators } = require('./utils/validation');
```

## Naming Conventions

### Files
- Use camelCase for file names (e.g., <!-- BROKEN REFERENCE: `httpClient.js` -->, <!-- BROKEN REFERENCE: `responseHelpers.js` -->)
- Use descriptive names that clearly indicate the file's purpose
- Group related functions in the same file

### Functions
- Use camelCase for function names
- Use descriptive names that clearly indicate the function's purpose
- Prefix boolean-returning functions with `is`, `has`, `can`, etc.
- Use verbs for action functions (e.g., `validateEmail`, `formatDate`)

### Constants
- Use UPPER_SNAKE_CASE for constants
- Group related constants in objects
- Export constants from <!-- BROKEN REFERENCE: `utils/common/constants.js` -->

### Variables
- Use camelCase for variable names
- Use descriptive names that clearly indicate the variable's purpose

## Documentation Standards

### Function Documentation
All functions should include JSDoc comments with:
- Brief description of what the function does
- `@param` tags for all parameters with types and descriptions
- `@returns` tag with return type and description
- `@throws` tag if the function can throw errors
- Usage examples for complex functions

Example:
```javascript
/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid, false otherwise
 * @throws {TypeError} - If email is not a string
 * 
 * @example
 * const isValid = validateEmail('user@example.com'); // true
 * const isInvalid = validateEmail('invalid-email'); // false
 */
const validateEmail = (email) => {
  // Implementation
};
```

### Module Documentation
Each module should include:
- Brief description of the module's purpose
- List of exported functions/objects
- Usage examples
- Any important notes or considerations

## Error Handling

### Consistent Error Patterns
- Use descriptive error messages
- Include relevant context in error objects
- Use appropriate error types (TypeError, ValidationError, etc.)
- Log errors appropriately based on severity

### Error Response Format
```javascript
{
  success: false,
  error: {
    code: 'ERROR_CODE',
    message: 'Human-readable error message',
    details: {}, // Additional error context
    timestamp: '2025-01-01T00:00:00.000Z'
  }
}
```

## Testing

### Test File Naming
- Test files should be named <!-- BROKEN REFERENCE: `[filename].test.js` -->
- Place test files in the same directory as the code being tested
- Use descriptive test names that explain what is being tested

### Test Structure
```javascript
describe('Module Name', () => {
  describe('functionName', () => {
    it('should handle valid input correctly', () => {
      // Test implementation
    });
    
    it('should throw error for invalid input', () => {
      // Test implementation
    });
  });
});
```

## Performance Considerations

- Use memoization for expensive computations
- Implement proper caching strategies
- Use connection pooling for database operations
- Implement retry logic with exponential backoff
- Monitor and log performance metrics

## Security Guidelines

- Validate all inputs
- Sanitize data before database operations
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Log security-related events
- Use secure defaults for configurations

## Migration Guide

When migrating existing code to use these utilities:

1. **Identify duplicate code patterns** across services
2. **Extract common functionality** into appropriate utility modules
3. **Update import statements** to use centralized utilities
4. **Test thoroughly** to ensure functionality is preserved
5. **Remove old duplicate code** after successful migration

## Contributing

When adding new utilities:

1. **Follow naming conventions** and documentation standards
2. **Add comprehensive tests** for new functions
3. **Update this README** if adding new modules or significant functionality
4. **Consider backward compatibility** when modifying existing utilities
5. **Review security implications** of new utilities

## Maintenance

- Regularly review and update utilities for performance improvements
- Monitor usage patterns to identify opportunities for new utilities
- Keep dependencies up to date
- Remove unused utilities to keep the library lean
- Update documentation as the library evolves