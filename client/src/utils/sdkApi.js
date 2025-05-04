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
  timeout: 60000 // 60 seconds timeout
});

/**
 * Get analytics data for a site
 * @param {string} siteId - The site ID to fetch analytics for
 * @returns {Promise} - API response with analytics data
 */
export const getAnalytics = async (siteId) => {
  try {
    const response = await sdkAxiosInstance.get(`/api/sdk/analytics/${siteId}`);
    return response.data;
  } catch (error) {
    console.error('SDK API Error - getAnalytics:', error);
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