const axios = require('axios');

/**
 * Create a configured axios instance for API calls with dynamic timeouts
 * based on endpoint type and request complexity
 * 
 * @param {Object} options - Configuration options
 * @returns {Object} - Configured axios instance
 */
const createApiClient = (options = {}) => {
  const {
    baseURL = process.env.BACKEND_API_URL || 'https://cryptique-backend.vercel.app/api',
    defaultTimeout = 15000, // Default to 15 seconds instead of 10
    retryCount = 3,
    retryDelay = 1000,
    headers = {}
  } = options;

  // Create axios instance with default config
  const apiClient = axios.create({
    baseURL,
    timeout: defaultTimeout,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });

  // Define timeout profiles for different types of operations
  const timeoutProfiles = {
    short: 5000,       // Quick operations (simple reads)
    default: 15000,    // Standard operations (most API calls)
    longRunning: 30000 // Complex operations (batch processing, reports)
  };
  
  // Function to get timeout based on operation type
  const getTimeout = (operationType = 'default') => {
    return timeoutProfiles[operationType] || timeoutProfiles.default;
  };

  // Add request interceptor for dynamic timeouts
  apiClient.interceptors.request.use(
    config => {
      // Get timeout from config or use default
      const operationType = config.operationType || 'default';
      config.timeout = getTimeout(operationType);
      
      // Log request in non-production environments
      if (process.env.NODE_ENV !== 'production') {
        console.log(`API Request: ${config.method.toUpperCase()} ${config.url} (timeout: ${config.timeout}ms)`);
      }
      
      return config;
    },
    error => Promise.reject(error)
  );

  // Add response interceptor for logging and optional retries
  apiClient.interceptors.response.use(
    response => {
      return response;
    },
    async error => {
      const { config } = error;
      
      // Skip retry for certain error types
      if (!config || !config.retry || config._retryCount >= retryCount || error.response?.status === 401) {
        return Promise.reject(error);
      }

      // Retry counter
      config._retryCount = config._retryCount || 0;
      config._retryCount++;

      // Calculate retry delay with exponential backoff
      const delay = retryDelay * Math.pow(2, config._retryCount - 1);
      
      console.warn(`API call to ${config.url} failed. Retrying (${config._retryCount}/${retryCount}) in ${delay}ms. Error: ${error.message}`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return apiClient(config);
    }
  );

  // Add utility methods to the client for different operation types
  return {
    ...apiClient,
    
    // Quick operations
    fetchQuick: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        operationType: 'short',
        retry: options.retry !== false // Enable retry by default
      });
    },
    
    // Standard operations
    fetch: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        operationType: 'default',
        retry: options.retry !== false // Enable retry by default
      });
    },
    
    // Long-running operations
    fetchComplex: (url, options = {}) => {
      return apiClient({
        ...options,
        url,
        operationType: 'longRunning',
        retry: options.retry !== false // Enable retry by default
      });
    }
  };
};

module.exports = createApiClient; 