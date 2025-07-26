/**
 * API Utilities - Centralized HTTP client configurations and response handling
 * 
 * This module provides standardized API client configurations, response formatting,
 * error handling utilities, and common request/response patterns for consistent 
 * API interactions across services.
 */

module.exports = {
  httpClient: require('./httpClient'),
  responseHelpers: require('./responseHelpers'),
  errorHandlers: require('./errorHandlers'),
  configHelpers: require('./configHelpers'),
  requestHelpers: require('./requestHelpers')
};