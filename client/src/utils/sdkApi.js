/**
 * sdkApi.js - Utility functions for interacting with Cryptique SDK APIs
 * Uses a non-credentialed axios instance for CORS compatibility
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
  timeout: 30000 // 30 seconds timeout (reduced from 60 seconds)
});

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
 * Get analytics data for a site
 * @param {string} siteId - The site ID to fetch analytics for
 * @returns {Promise} - API response with analytics data or subscription error
 */
export const getAnalytics = async (siteId) => {
  const fetchAnalytics = async () => {
    const response = await sdkAxiosInstance.get(`/api/sdk/analytics/${siteId}`);
    return response.data;
  };

  try {
    const result = await retryWithBackoff(fetchAnalytics);
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
 * Get chart data for a site
 * @param {string} siteId - The site ID
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @param {string} timeframe - Time frame (hourly, daily, etc.)
 * @returns {Promise} - API response with chart data
 */
export const getChart = async (siteId, startDate, endDate, timeframe = 'hourly') => {
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
    return response;
  } catch (error) {
    console.error('SDK API Error - getChart:', error);
    throw error;
  }
};

/**
 * Get traffic sources data for a site
 * @param {string} siteId - The site ID
 * @param {string} startDate - Start date in ISO format
 * @param {string} endDate - End date in ISO format
 * @returns {Promise} - API response with traffic sources data
 */
export const getTrafficSources = async (siteId, startDate, endDate) => {
  try {
    // Note: This endpoint uses the authenticated axiosInstance (not SDK endpoint)
    const response = await axiosInstance.get('/analytics/traffic-sources', {
      params: {
        siteId,
        start: startDate,
        end: endDate
      }
    });
    return response;
  } catch (error) {
    console.error('SDK API Error - getTrafficSources:', error);
    throw error;
  }
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
  verifySite
}; 