/**
 * Architecture configuration for the Cryptique Analytics API
 * 
 * This module provides configuration for the application architecture,
 * including:
 * - Direct database access vs. proxy mode
 * - Load balancing settings
 * - Service discovery
 * - Performance optimizations
 */

const os = require('os');

// Architecture modes
const ARCHITECTURE_MODES = {
  DIRECT: 'direct',      // Direct database access, no backend proxy
  HYBRID: 'hybrid',      // Use direct access when possible, fallback to proxy
  PROXY: 'proxy'         // Always proxy to backend API
};

// Default configuration
const DEFAULT_CONFIG = {
  // Architecture mode - determines how requests are processed
  mode: process.env.ARCHITECTURE_MODE || ARCHITECTURE_MODES.HYBRID,
  
  // Proxy settings (only used in PROXY or HYBRID modes)
  proxy: {
    // Backend API URL (can be a load balancer or API gateway)
    apiUrl: process.env.BACKEND_API_URL || 'https://cryptique-backend.vercel.app/api',
    
    // Cache frequently accessed proxy results (reduces backend load)
    enableCache: process.env.ENABLE_PROXY_CACHE !== 'false',
    
    // Timeout settings for proxy requests
    timeouts: {
      short: parseInt(process.env.PROXY_TIMEOUT_SHORT || '5000', 10),    // 5 seconds
      default: parseInt(process.env.PROXY_TIMEOUT_DEFAULT || '15000', 10), // 15 seconds
      long: parseInt(process.env.PROXY_TIMEOUT_LONG || '30000', 10)      // 30 seconds
    }
  },
  
  // Load balancing settings for horizontal scaling
  loadBalancing: {
    // Enable sticky sessions (keeps user on same server)
    enableStickySession: process.env.ENABLE_STICKY_SESSIONS === 'true',
    
    // Session cookie name for sticky sessions
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'cryptique_session',
    
    // Health check endpoint for load balancers
    healthCheckEndpoint: '/api/health',
    
    // Maximum worker instances per machine (default: CPU cores - 1)
    maxWorkers: parseInt(process.env.MAX_WORKERS || Math.max(1, os.cpus().length - 1), 10)
  },
  
  // Circuit breaker settings to handle backend failures gracefully
  circuitBreaker: {
    enabled: process.env.ENABLE_CIRCUIT_BREAKER !== 'false',
    failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '5', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET || '30000', 10) // 30 seconds
  },
  
  // Feature flags for architecture components
  features: {
    // Direct database access (requires database connection)
    enableDirectDbAccess: process.env.ENABLE_DIRECT_DB_ACCESS !== 'false',
    
    // Bypass proxy for read-only operations
    bypassProxyForReads: process.env.BYPASS_PROXY_FOR_READS === 'true',
    
    // Enable batching of backend requests
    enableRequestBatching: process.env.ENABLE_REQUEST_BATCHING === 'true',
    
    // Enable background refresh of cached data
    enableBackgroundRefresh: process.env.ENABLE_BACKGROUND_REFRESH === 'true'
  }
};

/**
 * Get architecture configuration with optional overrides
 * @param {Object} overrides - Configuration overrides
 * @returns {Object} - Final configuration
 */
function getConfig(overrides = {}) {
  const config = { ...DEFAULT_CONFIG };
  
  // Apply environment-specific overrides
  if (process.env.NODE_ENV === 'production') {
    // Production defaults
    config.features.enableRequestBatching = true;
    config.features.enableBackgroundRefresh = true;
  } else if (process.env.NODE_ENV === 'development') {
    // Development defaults
    config.mode = ARCHITECTURE_MODES.HYBRID; // More flexibility for development
  }
  
  // Apply custom overrides
  return {
    ...config,
    ...overrides,
    // Merge nested objects properly
    proxy: { ...config.proxy, ...(overrides.proxy || {}) },
    loadBalancing: { ...config.loadBalancing, ...(overrides.loadBalancing || {}) },
    circuitBreaker: { ...config.circuitBreaker, ...(overrides.circuitBreaker || {}) },
    features: { ...config.features, ...(overrides.features || {}) }
  };
}

module.exports = {
  ARCHITECTURE_MODES,
  DEFAULT_CONFIG,
  getConfig
}; 