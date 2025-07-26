/**
 * Centralized Utility Library
 * 
 * This is the main entry point for all utility functions used across the application.
 * It provides organized access to API utilities, validation helpers, database operations,
 * middleware configurations, and common helper functions.
 * 
 * Usage:
 *   const { api, validation, database, middleware, common } = require('./utils');
 *   
 *   // Use API utilities
 *   const client = api.httpClient.createApiClient();
 *   
 *   // Use validation utilities
 *   const isValid = validation.inputValidators.validateEmail(email);
 *   
 *   // Use database utilities
 *   const result = await database.queryHelpers.findWithRetry(Model, query);
 */

module.exports = {
  api: require('./api'),
  validation: require('./validation'),
  database: require('./database'),
  middleware: require('./middleware'),
  common: require('./common')
};