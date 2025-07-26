/**
 * Database Utilities Index
 * Centralized exports for all database utility functions
 */

const connectionHelpers = require('./connectionHelpers');
const queryHelpers = require('./queryHelpers');
const errorHandlers = require('./errorHandlers');
const transactionHelpers = require('./transactionHelpers');
const modelOperations = require('./modelOperations');

module.exports = {
  // Connection utilities
  ...connectionHelpers,
  
  // Query utilities
  ...queryHelpers,
  
  // Error handling utilities
  ...errorHandlers,
  
  // Transaction utilities
  ...transactionHelpers,
  
  // Model operations
  ...modelOperations,
  
  // Grouped exports for specific use cases
  connection: connectionHelpers,
  query: queryHelpers,
  errors: errorHandlers,
  transactions: transactionHelpers,
  models: modelOperations
};