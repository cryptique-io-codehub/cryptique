/**
 * Backend API Proxy Service
 * 
 * This service handles proxying requests to the backend API with:
 * - Circuit breaker pattern for resilience
 * - Caching to reduce backend load
 * - Request batching for efficiency
 * - Retries for transient failures
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { getConfig, ARCHITECTURE_MODES } = require('../config/architecture');

// Create cache with TTL of 5 minutes by default
const cache = new NodeCache({
  stdTTL: 300,  // 5 minutes
  checkperiod: 60,  // Check for expired keys every minute
  useClones: false  // For memory efficiency
});

// Get architecture configuration
const config = getConfig();

// Create circuit breakers for different API endpoints
const circuitBreakers = {
  // For team-related endpoints
  teams: createCircuitBreaker({
    name: 'teams-api',
    failureThreshold: 3,
    resetTimeout: 15000,  // 15 seconds
    timeout: config.proxy.timeouts.default
  }),
  
  // For analytics endpoints
  analytics: createCircuitBreaker({
    name: 'analytics-api',
    failureThreshold: 5,  // Higher threshold for analytics (less critical)
    resetTimeout: 30000,  // 30 seconds
    timeout: config.proxy.timeouts.long
  }),
  
  // For read-only operations
  readonly: createCircuitBreaker({
    name: 'readonly-api',
    failureThreshold: 3,
    resetTimeout: 10000,  // 10 seconds
    timeout: config.proxy.timeouts.short
  }),
  
  // Default circuit breaker
  default: createCircuitBreaker({
    name: 'default-api',
    failureThreshold: 3,
    resetTimeout: 20000,  // 20 seconds
    timeout: config.proxy.timeouts.default
  })
};

/**
 * Create a cached API client with circuit breaker
 * @param {Object} options - Client options
 * @returns {Object} - API client
 */
function createApiClient(options = {}) {
  const {
    baseURL = config.proxy.apiUrl,
    timeout = config.proxy.timeouts.default,
    circuitName = 'default'
  } = options;
  
  // Create axios instance
  const client = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Get circuit breaker
  const circuitBreaker = circuitBreakers[circuitName] || circuitBreakers.default;
  
  // Wrap client methods with circuit breaker
  const wrappedClient = {
    async get(url, options = {}) {
      const { useCache = true, cacheTTL = 300, ...axiosOptions } = options;
      
      // Generate cache key from URL and query params
      const cacheKey = `GET:${url}:${JSON.stringify(axiosOptions.params || {})}`;
      
      // Check cache if enabled
      if (useCache && config.proxy.enableCache) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      // Execute request with circuit breaker
      try {
        const response = await circuitBreaker.execute(
          () => client.get(url, axiosOptions)
        );
        
        // Cache successful response if enabled
        if (useCache && config.proxy.enableCache && response.status === 200) {
          cache.set(cacheKey, response.data, cacheTTL);
        }
        
        return response.data;
      } catch (error) {
        // If we have stale cached data, return it as fallback
        if (useCache && config.proxy.enableCache) {
          const staleData = cache.get(cacheKey);
          if (staleData) {
            console.log(`Using stale cached data for ${cacheKey} due to API error`);
            return {
              ...staleData,
              _meta: {
                stale: true,
                error: error.message
              }
            };
          }
        }
        
        throw error;
      }
    },
    
    async post(url, data, options = {}) {
      // POST requests are not cached
      const response = await circuitBreaker.execute(
        () => client.post(url, data, options)
      );
      return response.data;
    },
    
    async put(url, data, options = {}) {
      // PUT requests are not cached
      const response = await circuitBreaker.execute(
        () => client.put(url, data, options)
      );
      return response.data;
    },
    
    async delete(url, options = {}) {
      // DELETE requests are not cached
      const response = await circuitBreaker.execute(
        () => client.delete(url, options)
      );
      return response.data;
    },
    
    // Clear cache for specific pattern
    clearCache(pattern) {
      if (!pattern) return 0;
      
      const keys = cache.keys();
      let count = 0;
      
      for (const key of keys) {
        if (key.includes(pattern)) {
          cache.del(key);
          count++;
        }
      }
      
      return count;
    },
    
    // Get circuit breaker status
    getCircuitStatus() {
      return circuitBreaker.getStatus();
    }
  };
  
  return wrappedClient;
}

// Create default clients
const defaultClient = createApiClient();
const teamsClient = createApiClient({ circuitName: 'teams' });
const analyticsClient = createApiClient({ circuitName: 'analytics' });
const readonlyClient = createApiClient({ circuitName: 'readonly', timeout: config.proxy.timeouts.short });

/**
 * Determine if a request should be proxied or handled directly
 * @param {string} operationType - Type of operation (read/write)
 * @returns {boolean} - Whether to use proxy
 */
function shouldUseProxy(operationType = 'read') {
  // In direct mode, never use proxy
  if (config.mode === ARCHITECTURE_MODES.DIRECT) {
    return false;
  }
  
  // In proxy mode, always use proxy
  if (config.mode === ARCHITECTURE_MODES.PROXY) {
    return true;
  }
  
  // In hybrid mode, use direct access for reads if enabled
  if (
    config.mode === ARCHITECTURE_MODES.HYBRID &&
    operationType === 'read' &&
    config.features.bypassProxyForReads
  ) {
    return false;
  }
  
  // Default to using proxy in hybrid mode
  return true;
}

// Export the service
module.exports = {
  // Clients for different endpoints
  defaultClient,
  teamsClient,
  analyticsClient,
  readonlyClient,
  
  // Factory function for custom clients
  createApiClient,
  
  // Utility functions
  shouldUseProxy,
  
  // Cache management
  clearCache: (pattern) => defaultClient.clearCache(pattern),
  
  // Circuit breaker management
  getCircuitStatuses: () => {
    return Object.entries(circuitBreakers).reduce((statuses, [name, breaker]) => {
      statuses[name] = breaker.getStatus();
      return statuses;
    }, {});
  },
  
  // Reset all circuit breakers
  resetCircuits: () => {
    Object.values(circuitBreakers).forEach(breaker => breaker.reset());
  }
}; 