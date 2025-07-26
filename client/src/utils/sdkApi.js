/**
 * sdkApi.js - Utility functions for interacting with Cryptique SDK APIs
 * Uses a non-credentialed axios instance for CORS compatibility
 * OPTIMIZED VERSION with caching and performance improvements
 */

import axios from 'axios';
import axiosInstance from '../axiosInstance';

// Base URL for API calls
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

// Create specialized SDK axios instance that doesn't use credentials
const sdkAxiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false, // Don't send credentials for SDK requests
  timeout: 20000 // Reduced timeout for faster feedback
});

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Cache helper functions
 */
const getCacheKey = (endpoint, params) => {
  return `${endpoint}_${JSON.stringify(params)}`;
};

const getCachedData = (key) => {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  apiCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} - Result of the function
 */
const retryWithBackoff = async (fn, retries = 2, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && (
      error.code === 'ECONNABORTED' || 
      error.message.includes('timeout') ||
      (error.response && error.response.status >= 500)
    )) {
      console.log(`Retrying request in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Get analytics data for a site - OPTIMIZED VERSION
 * @param {string} siteId - The site ID to fetch analytics for
 * @param {Object} options - Additional options
 * @returns {Promise} - API response with analytics data or subscription error
 */
export const getAnalytics = async (siteId, options = {}) => {
  const {
    dateRange = '30d',
    includeDetailedSessions = false,
    useCache = true
  } = options;

  // Check cache first
  const cacheKey = getCacheKey('analytics', { siteId, dateRange, includeDetailedSessions });
  if (useCache) {
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Using cached analytics data');
      return cachedData;
    }
  }

  const fetchAnalytics = async () => {
    const response = await sdkAxiosInstance.get(`/api/sdk/analytics/${siteId}`, {
      params: {
        dateRange,
        includeDetailedSessions,
        limit: includeDetailedSessions ? 1000 : 0
      }
    });
    return response.data;
  };

  try {
    const result = await retryWithBackoff(fetchAnalytics);
    
    // Cache successful responses
    if (result && !result.error && !result.subscriptionError && useCache) {
      setCachedData(cacheKey, result);
    }
    
    return result;
  } catch (error) {
    console.error('SDK API Error - getAnalytics:', error);
    
    // Handle timeout errors specifically
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn(`Analytics request timed out for site ${siteId}. This may indicate server performance issues.`);
      return {
        error: true,
        message: 'Analytics data is taking longer than expected to load. Please try again.',
        type: 'TIMEOUT'
      };
    }
    
    // Check if this is a subscription/grace period error
    if (error.response && error.response.status === 403) {
      const errorData = error.response.data;
      
      // Format and return the subscription error information
      if (errorData.error === 'Subscription required') {
        return {
          subscriptionError: true,
          message: errorData.message,
          status: errorData.subscriptionStatus,
          gracePeriod: errorData.gracePeriod || null
        };
      }
    }
    
    // Handle 408 Request Timeout from backend
    if (error.response && error.response.status === 408) {
      console.warn(`Backend timeout for site ${siteId}`);
      return {
        error: true,
        message: 'The server is experiencing high load. Analytics data may take a moment to appear.',
        type: 'SERVER_TIMEOUT'
      };
    }
    
    // Handle server errors (5xx)
    if (error.response && error.response.status >= 500) {
      return {
        error: true,
        message: 'Server error occurred while fetching analytics. Please try again later.',
        type: 'SERVER_ERROR'
      };
    }
    
    throw error;
  }
};

/**
 * Get chart data for a site - OPTIMIZED VERSION
 * @param {string} siteId - The site ID
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @param {string} timeframe - Time frame (hourly, daily, etc.)
 * @returns {Promise} - API response with chart data
 */
export const getChart = async (siteId, startDate, endDate, timeframe = 'hourly') => {
  // Check cache first
  const cacheKey = getCacheKey('chart', { siteId, startDate, endDate, timeframe });
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('Using cached chart data');
    return cachedData;
  }

  try {
    // Note: This endpoint uses the authenticated axiosInstance (not SDK endpoint)
    const response = await axiosInstance.get('/analytics/chart', {
      params: {
        siteId,
        timeframe,
        start: startDate,
        end: endDate
      }
    });
    
    // Cache successful responses
    if (response.data && !response.data.error) {
      setCachedData(cacheKey, response);
    }
    
    return response;
  } catch (error) {
    console.error('SDK API Error - getChart:', error);
    throw error;
  }
};

/**
 * Get traffic sources data for a site - OPTIMIZED VERSION
 * @param {string} siteId - The site ID
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {Promise} - API response with traffic sources data
 */
export const getTrafficSources = async (siteId, startDate, endDate) => {
  // Check cache first
  const cacheKey = getCacheKey('traffic-sources', { siteId, startDate, endDate });
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log('Using cached traffic sources data');
    return cachedData;
  }

  try {
    // Note: This endpoint uses the authenticated axiosInstance (not SDK endpoint)
    const response = await axiosInstance.get('/analytics/traffic-sources', {
      params: {
        siteId,
        start: startDate,
        end: endDate
      }
    });
    
    // Cache successful responses
    if (response.data && !response.data.error) {
      setCachedData(cacheKey, response);
    }
    
    return response;
  } catch (error) {
    console.error('SDK API Error - getTrafficSources:', error);
    throw error;
  }
};

/**
 * Clear cache for a specific site or all cache
 * @param {string} siteId - Optional site ID to clear cache for
 */
export const clearCache = (siteId = null) => {
  if (siteId) {
    // Clear cache entries for specific site
    for (const key of apiCache.keys()) {
      if (key.includes(siteId)) {
        apiCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    apiCache.clear();
  }
  console.log('API cache cleared');
};

/**
 * Verify a website's SDK installation
 * @param {string} domain - The website domain
 * @param {string} siteId - The site ID to verify
 * @returns {Promise} - API response with verification status
 */
export const verifySite = async (domain, siteId) => {
  try {
    // Note: This uses the regular axiosInstance because it's an authenticated call
    const response = await axiosInstance.post('/website/verify', {
      Domain: domain,
      siteId: siteId
    });
    return response.data;
  } catch (error) {
    console.error('SDK API Error - verifySite:', error);
    throw error;
  }
};

export default {
  getAnalytics,
  getChart,
  getTrafficSources,
  verifySite,
  clearCache
}; 