/**
 * HTTP Client Utilities
 * 
 * Centralized HTTP client configurations with retry logic, timeout management,
 * and standardized request/response handling.
 */

const axios = require('axios');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../common/constants');

/**
 * Create a configured axios instance for API calls with dynamic timeouts
 * based on endpoint type and request complexity
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.baseURL - Base URL for API calls
 * @param {number} options.defaultTimeout - Default timeout in milliseconds
 * @param {number} options.retryCount - Number of retry attempts
 * @param {number} options.retryDelay - Base delay between retries in milliseconds
 * @param {Object} options.headers - Default headers
 * @param {boolean} options.enableRetry - Enable automatic retry on failures
 * @returns {Object} - Configured axios instance with utility methods
 */
const createApiClient = (options = {}) => {
  const {
    baseURL = process.env.API_BASE_URL || 'http://localhost:3000/api',
    defaultTimeout = 15000,
    retryCount = 3,
    retryDelay = 1000,
    headers = {},
    enableRetry = true
  } = options;

  // Create axios instance with default config
  const apiClient = axios.create({
    baseURL,
    timeout: defaultTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    }
  });

  // Define timeout profiles for different types of operations
  const timeoutProfiles = {
    quick: 5000,       // Quick operations (simple reads, health checks)
    standard: 15000,   // Standard operations (most API calls)
    complex: 30000,    // Complex operations (batch processing, reports)
    upload: 60000      // File upload operations
  };
  
  /**
   * Get timeout based on operation type
   * @param {string} operationType - Type of operation
   * @returns {number} - Timeout in milliseconds
   */
  const getTimeout = (operationType = 'standard') => {
    return timeoutProfiles[operationType] || timeoutProfiles.standard;
  };

  // Add request interceptor for dynamic timeouts and logging
  apiClient.interceptors.request.use(
    config => {
      // Set timeout based on operation type
      const operationType = config.operationType || 'standard';
      config.timeout = getTimeout(operationType);
      
      // Add request timestamp for performance monitoring
      config.metadata = {
        startTime: Date.now(),
        operationType
      };
      
      // Log request in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url} (timeout: ${config.timeout}ms)`);
      }
      
      return config;
    },
    error => {
      console.error('[HTTP] Request interceptor error:', error.message);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for logging and retry logic
  apiClient.interceptors.response.use(
    response => {
      // Log response time in non-production environments
      if (process.env.NODE_ENV !== 'production' && response.config.metadata) {
        const duration = Date.now() - response.config.metadata.startTime;
        console.log(`[HTTP] ${response.status} ${response.config.url} (${duration}ms)`);
      }
      
      return response;
    },
    async error => {
      const { config, response } = error;
      
      // Log error
      const status = response?.status || 'NETWORK_ERROR';
      const url = config?.url || 'unknown';
      console.error(`[HTTP] ${status} ${url} - ${error.message}`);
      
      // Skip retry for certain conditions
      if (!enableRetry || !config || !config.retry || config._retryCount >= retryCount) {
        return Promise.reject(error);
      }
      
      // Skip retry for client errors (4xx) except 408, 429
      if (response?.status >= 400 && response?.status < 500 && 
          response?.status !== 408 && response?.status !== 429) {
        return Promise.reject(error);
      }

      // Initialize retry counter
      config._retryCount = config._retryCount || 0;
      config._retryCount++;

      // Calculate retry delay with exponential backoff and jitter
      const baseDelay = retryDelay * Math.pow(2, config._retryCount - 1);
      const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
      const delay = Math.min(baseDelay + jitter, 30000); // Max 30 seconds
      
      console.warn(`[HTTP] Retrying ${config.url} (${config._retryCount}/${retryCount}) in ${Math.round(delay)}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return apiClient(config);
    }
  );

  // Utility methods for different operation types
  const clientMethods = {
    /**
     * Quick operations (health checks, simple reads)
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} - Axios response promise
     */
    quick: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        method: options.method || 'GET',
        operationType: 'quick',
        retry: options.retry !== false
      });
    },
    
    /**
     * Standard operations (most API calls)
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} - Axios response promise
     */
    standard: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        method: options.method || 'GET',
        operationType: 'standard',
        retry: options.retry !== false
      });
    },
    
    /**
     * Complex operations (batch processing, reports)
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} - Axios response promise
     */
    complex: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        method: options.method || 'GET',
        operationType: 'complex',
        retry: options.retry !== false
      });
    },
    
    /**
     * Upload operations (file uploads)
     * @param {string} url - Request URL
     * @param {FormData|Object} data - Upload data
     * @param {Object} options - Request options
     * @returns {Promise} - Axios response promise
     */
    upload: (url, data, options = {}) => {
      const headers = { ...options.headers };
      
      // Set appropriate headers for file upload
      if (data instanceof FormData) {
        headers['Content-Type'] = 'multipart/form-data';
      }
      
      return apiClient({
        ...options,
        url,
        method: 'POST',
        data,
        headers,
        operationType: 'upload',
        retry: false // Don't retry uploads by default
      });
    }
  };

  // Add standard HTTP methods
  const httpMethods = {
    get: (url, config = {}) => apiClient.get(url, { ...config, retry: config.retry !== false }),
    post: (url, data, config = {}) => apiClient.post(url, data, { ...config, retry: config.retry !== false }),
    put: (url, data, config = {}) => apiClient.put(url, data, { ...config, retry: config.retry !== false }),
    patch: (url, data, config = {}) => apiClient.patch(url, data, { ...config, retry: config.retry !== false }),
    delete: (url, config = {}) => apiClient.delete(url, { ...config, retry: config.retry !== false })
  };

  // Return enhanced client with utility methods
  return {
    ...apiClient,
    ...clientMethods,
    ...httpMethods,
    
    // Configuration methods
    setBaseURL: (newBaseURL) => {
      apiClient.defaults.baseURL = newBaseURL;
    },
    
    setDefaultHeaders: (newHeaders) => {
      Object.assign(apiClient.defaults.headers, newHeaders);
    },
    
    // Utility to create a new client with different config
    createChild: (childOptions = {}) => {
      return createApiClient({
        ...options,
        ...childOptions
      });
    }
  };
};

/**
 * Create a specialized client for backend API calls
 * @param {Object} options - Configuration options
 * @returns {Object} - Configured API client for backend
 */
const createBackendClient = (options = {}) => {
  return createApiClient({
    baseURL: process.env.BACKEND_API_URL || 'http://localhost:5000/api',
    ...options
  });
};

/**
 * Create a specialized client for server API calls
 * @param {Object} options - Configuration options
 * @returns {Object} - Configured API client for server
 */
const createServerClient = (options = {}) => {
  return createApiClient({
    baseURL: process.env.SERVER_API_URL || 'http://localhost:8000/api',
    ...options
  });
};

/**
 * Create a client with authentication headers
 * @param {string} token - Authentication token
 * @param {Object} options - Configuration options
 * @returns {Object} - Configured API client with auth headers
 */
const createAuthenticatedClient = (token, options = {}) => {
  return createApiClient({
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
};

module.exports = {
  createApiClient,
  createBackendClient,
  createServerClient,
  createAuthenticatedClient
};