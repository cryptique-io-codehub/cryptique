/**
 * Validation Utilities Usage Examples
 * 
 * This file demonstrates how to use the centralized validation utilities
 * to replace common validation patterns found throughout the codebase.
 */

const express = require('express');
const { validation } = require('../index');
const { responseHelpers, errorHandlers } = require('../api');

// Example 1: Input validation in route handlers
const userRegistrationHandler = responseHelpers.asyncHandler(async (req, res) => {
  // Validate email
  const emailValidation = validation.inputValidators.validateEmail(req.body.email);
  if (!emailValidation.isValid) {
    throw new errorHandlers.ValidationError(emailValidation.error, { field: 'email' });
  }

  // Validate password
  const passwordValidation = validation.inputValidators.validatePassword(req.body.password, {
    userData: { email: emailValidation.value }
  });
  if (!passwordValidation.isValid) {
    throw new errorHandlers.ValidationError(passwordValidation.error, { field: 'password' });
  }

  // Validate name
  const nameValidation = validation.inputValidators.validateStringLength(req.body.name, {
    minLength: 2,
    maxLength: 50,
    fieldName: 'Name'
  });
  if (!nameValidation.isValid) {
    throw new errorHandlers.ValidationError(nameValidation.error, { field: 'name' });
  }

  // Process registration with validated data
  const userData = {
    email: emailValidation.value,
    password: passwordValidation.value,
    name: nameValidation.value
  };

  // ... registration logic ...

  responseHelpers.sendSuccess(res, { message: 'User registered successfully' });
});

// Example 2: Authentication middleware using validation utilities
const authMiddleware = validation.authValidators.createAuthMiddleware({
  required: true,
  attachUser: true,
  userModel: require('../../backend/models/User') // Adjust path as needed
});

// Example 3: Team access validation
const teamAccessMiddleware = (TeamModel) => {
  return validation.authValidators.createTeamAccessMiddleware(TeamModel, {
    teamIdSource: 'params',
    teamIdField: 'teamId',
    requireRole: null, // Any role is fine
    requirePermissions: [] // No specific permissions required
  });
};

// Example 4: Smart contract validation
const addSmartContractHandler = responseHelpers.asyncHandler(async (req, res) => {
  // Validate contract data
  const contractValidation = validation.dataValidators.validateSmartContractData(req.body, {
    requiredFields: ['address', 'chain', 'teamId'],
    validateAddress: true
  });

  if (!contractValidation.isValid) {
    throw new errorHandlers.ValidationError(
      'Invalid contract data',
      { errors: contractValidation.errors }
    );
  }

  // Use validated data
  const contractData = contractValidation.values;

  // ... save contract logic ...

  responseHelpers.sendSuccess(res, contractData, 'Contract added successfully');
});

// Example 5: Analytics event validation
const trackEventHandler = responseHelpers.asyncHandler(async (req, res) => {
  // Validate analytics event
  const eventValidation = validation.dataValidators.validateAnalyticsEvent(req.body, {
    requiredFields: ['siteId', 'event'],
    maxEventNameLength: 100,
    maxPropertyValueLength: 1000
  });

  if (!eventValidation.isValid) {
    throw new errorHandlers.ValidationError(
      'Invalid event data',
      { errors: eventValidation.errors }
    );
  }

  // Process validated event
  const eventData = eventValidation.values;

  // ... tracking logic ...

  responseHelpers.sendSuccess(res, { received: true });
});

// Example 6: Pagination and sorting validation
const getAnalyticsHandler = responseHelpers.asyncHandler(async (req, res) => {
  // Validate pagination
  const paginationValidation = validation.dataValidators.validatePaginationParams(req.query, {
    defaultPage: 1,
    defaultLimit: 10,
    maxLimit: 100
  });

  // Validate sorting
  const sortValidation = validation.dataValidators.validateSortParams(req.query, {
    allowedFields: ['timestamp', 'event', 'userId'],
    defaultSort: 'timestamp',
    defaultOrder: 'desc'
  });

  if (!sortValidation.isValid) {
    throw new errorHandlers.ValidationError(
      'Invalid sort parameters',
      { errors: sortValidation.errors }
    );
  }

  // Validate date range
  const dateRangeValidation = validation.dataValidators.validateDateRangeParams(req.query, {
    maxRangeDays: 90,
    allowFuture: false
  });

  if (!dateRangeValidation.isValid) {
    throw new errorHandlers.ValidationError(
      'Invalid date range',
      { errors: dateRangeValidation.errors }
    );
  }

  // Use validated parameters
  const { page, limit, skip } = paginationValidation.values;
  const { mongoSort } = sortValidation.values;
  const { startDate, endDate } = dateRangeValidation.values;

  // ... query logic with validated parameters ...

  responseHelpers.sendPaginated(res, [], { page, limit, total: 0 });
});

// Example 7: Bulk transaction validation
const processBulkTransactionsHandler = responseHelpers.asyncHandler(async (req, res) => {
  const transactions = req.body.transactions;

  // Validate bulk transaction data
  const bulkValidation = validation.dataValidators.validateBulkData(
    transactions,
    (transaction) => validation.dataValidators.validateTransactionData(transaction, {
      requiredFields: ['tx_hash', 'from_address', 'contract_address'],
      validateAddresses: true,
      validateHash: true
    }),
    {
      maxItems: 1000,
      stopOnFirstError: false
    }
  );

  if (!bulkValidation.isValid) {
    throw new errorHandlers.ValidationError(
      'Invalid transaction data',
      { 
        errors: bulkValidation.errors,
        validCount: bulkValidation.validItems.length,
        invalidCount: bulkValidation.invalidItems.length
      }
    );
  }

  // Process valid transactions
  const validTransactions = bulkValidation.validItems.map(item => item.data);

  // ... processing logic ...

  responseHelpers.sendSuccess(res, {
    processed: validTransactions.length,
    skipped: bulkValidation.invalidItems.length,
    errors: bulkValidation.invalidItems
  });
});

// Example 8: API key validation middleware
const apiKeyMiddleware = (req, res, next) => {
  const apiKeyValidation = validation.authValidators.validateApiKey(req, {
    headerName: 'x-api-key',
    envVarName: 'API_KEY',
    required: true
  });

  if (!apiKeyValidation.isValid) {
    throw new errorHandlers.AuthenticationError(apiKeyValidation.error);
  }

  next();
};

// Example 9: Subscription access validation
const subscriptionMiddleware = (feature) => {
  return responseHelpers.asyncHandler(async (req, res, next) => {
    if (!req.team) {
      throw new errorHandlers.AuthorizationError('Team information required');
    }

    const subscriptionValidation = validation.authValidators.validateSubscriptionAccess(
      req.team,
      feature,
      {
        allowGracePeriod: true,
        gracePeriodDays: 7
      }
    );

    if (!subscriptionValidation.isValid) {
      throw new errorHandlers.AuthorizationError(subscriptionValidation.error);
    }

    req.subscriptionInfo = {
      plan: subscriptionValidation.plan,
      status: subscriptionValidation.status
    };

    next();
  });
};

// Example 10: Complete route with all validations
function createCompleteValidatedRoute() {
  const router = express.Router();

  // Apply authentication
  router.use(authMiddleware);

  // Team-specific route with full validation
  router.post('/teams/:teamId/contracts',
    teamAccessMiddleware(require('../../backend/models/Team')), // Adjust path
    subscriptionMiddleware('smart_contracts'),
    responseHelpers.asyncHandler(async (req, res) => {
      // Validate team ID from params
      const teamIdValidation = validation.inputValidators.validateObjectId(
        req.params.teamId,
        { fieldName: 'Team ID' }
      );

      if (!teamIdValidation.isValid) {
        throw new errorHandlers.BadRequestError(teamIdValidation.error);
      }

      // Validate contract data
      const contractValidation = validation.dataValidators.validateSmartContractData({
        ...req.body,
        teamId: teamIdValidation.value
      });

      if (!contractValidation.isValid) {
        throw new errorHandlers.ValidationError(
          'Invalid contract data',
          { errors: contractValidation.errors }
        );
      }

      // All validations passed, process the request
      const contractData = contractValidation.values;

      // ... business logic ...

      responseHelpers.sendSuccess(res, contractData, 'Contract added successfully');
    })
  );

  return router;
}

// Example 11: Error handling with validation utilities
const handleValidationErrors = (error, req, res, next) => {
  if (error instanceof errorHandlers.ValidationError) {
    return responseHelpers.sendResponse(res, 
      responseHelpers.createValidationErrorResponse(
        error.details.errors || [error.message]
      )
    );
  }

  if (error instanceof errorHandlers.AuthenticationError) {
    return responseHelpers.sendResponse(res,
      responseHelpers.createAuthErrorResponse(error.message)
    );
  }

  if (error instanceof errorHandlers.AuthorizationError) {
    return responseHelpers.sendResponse(res,
      responseHelpers.createForbiddenResponse(error.message)
    );
  }

  next(error);
};

// Example 12: Validation utility functions for common patterns
const validateRequestParams = (req, validationRules) => {
  const errors = [];
  const validatedData = {};

  for (const [field, rules] of Object.entries(validationRules)) {
    const value = req.body[field] || req.params[field] || req.query[field];
    
    for (const rule of rules) {
      const result = rule.validator(value, rule.options);
      
      if (!result.isValid) {
        errors.push(`${field}: ${result.error}`);
        break;
      } else {
        validatedData[field] = result.value;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: validatedData
  };
};

// Usage of validation utility function
const exampleWithValidationRules = responseHelpers.asyncHandler(async (req, res) => {
  const validationResult = validateRequestParams(req, {
    email: [
      { validator: validation.inputValidators.validateEmail, options: { required: true } }
    ],
    siteId: [
      { validator: validation.inputValidators.validateObjectId, options: { fieldName: 'Site ID' } }
    ],
    startDate: [
      { validator: validation.inputValidators.validateDate, options: { required: false, pastOnly: true } }
    ]
  });

  if (!validationResult.isValid) {
    throw new errorHandlers.ValidationError(
      'Validation failed',
      { errors: validationResult.errors }
    );
  }

  // Use validated data
  const { email, siteId, startDate } = validationResult.data;

  // ... business logic ...

  responseHelpers.sendSuccess(res, { email, siteId, startDate });
});

module.exports = {
  userRegistrationHandler,
  authMiddleware,
  teamAccessMiddleware,
  addSmartContractHandler,
  trackEventHandler,
  getAnalyticsHandler,
  processBulkTransactionsHandler,
  apiKeyMiddleware,
  subscriptionMiddleware,
  createCompleteValidatedRoute,
  handleValidationErrors,
  validateRequestParams,
  exampleWithValidationRules
};