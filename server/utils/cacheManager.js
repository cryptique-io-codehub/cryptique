const NodeCache = require('node-cache');

/**
 * Cache manager for storing and retrieving API responses
 */
class CacheManager {
  /**
   * Create a new cache manager
   * @param {Object} options - Cache options
   */
  constructor(options = {}) {
    const {
      defaultTTL = 300, // 5 minutes in seconds
      checkPeriod = 60, // Check for expired keys every 60 seconds
      maxKeys = -1,     // No limit by default
      useClones = false // Don't clone objects for better performance
    } = options;
    
    this.cache = new NodeCache({
      stdTTL: defaultTTL,
      checkperiod: checkPeriod,
      maxKeys,
      useClones
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    // Cache TTL profiles for different data types (in seconds)
    this.ttlProfiles = {
      short: 60,           // 1 minute
      default: 300,         // 5 minutes
      medium: 1800,         // 30 minutes 
      long: 3600,           // 1 hour
      veryLong: 86400       // 24 hours
    };
  }
  
  /**
   * Get TTL value for a profile
   * @param {string} profile - TTL profile name
   * @returns {number} - TTL in seconds
   */
  getTTL(profile = 'default') {
    return this.ttlProfiles[profile] || this.ttlProfiles.default;
  }
  
  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to store
   * @param {string|number} ttlProfile - TTL profile or time in seconds
   * @returns {boolean} - Success status
   */
  set(key, value, ttlProfile = 'default') {
    // Handle null values - don't cache nulls
    if (value === null || value === undefined) {
      return false;
    }
    
    // Determine TTL in seconds
    const ttl = typeof ttlProfile === 'string' 
      ? this.getTTL(ttlProfile)
      : ttlProfile;
    
    const success = this.cache.set(key, value, ttl);
    this.stats.sets++;
    return success;
  }
  
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or undefined if not found
   */
  get(key) {
    const value = this.cache.get(key);
    
    if (value === undefined) {
      this.stats.misses++;
      return undefined;
    }
    
    this.stats.hits++;
    return value;
  }
  
  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists
   */
  has(key) {
    return this.cache.has(key);
  }
  
  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if successful
   */
  delete(key) {
    return this.cache.del(key);
  }
  
  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern to match (e.g. 'analytics:*')
   * @returns {number} - Number of keys deleted
   */
  deletePattern(pattern) {
    const keys = this.cache.keys().filter(key => {
      // Simple pattern matching with * wildcard
      if (pattern === '*') return true;
      
      const regexPattern = new RegExp(
        '^' + pattern.replace(/\*/g, '.*') + '$'
      );
      
      return regexPattern.test(key);
    });
    
    if (keys.length > 0) {
      this.cache.del(keys);
    }
    
    return keys.length;
  }
  
  /**
   * Get cache stats
   * @returns {Object} - Cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      keys: this.cache.keys().length,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
  
  /**
   * Reset cache stats
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }
  
  /**
   * Clear entire cache
   */
  clear() {
    this.cache.flushAll();
  }
  
  /**
   * Wrap function execution with caching
   * @param {string} key - Cache key
   * @param {Function} fn - Function to execute if cache miss
   * @param {string|number} ttlProfile - TTL profile or time in seconds
   * @returns {Promise<any>} - Result (from cache or function)
   */
  async wrap(key, fn, ttlProfile = 'default') {
    // Check cache first
    const cachedValue = this.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    // Execute function on cache miss
    const result = await fn();
    
    // Cache the result
    this.set(key, result, ttlProfile);
    
    return result;
  }
}

// Create a singleton instance
const defaultCache = new CacheManager();

module.exports = {
  defaultCache,
  CacheManager
}; 