/**
 * General Helper Functions
 * 
 * Common utility functions used throughout the application.
 */

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} - Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} - True if empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Generate a random string
 * @param {number} length - Length of string to generate
 * @param {string} charset - Character set to use (default: alphanumeric)
 * @returns {string} - Random string
 */
const generateRandomString = (length = 10, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after delay
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Promise that resolves with function result
 */
const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    exponential = true,
    jitter = true
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      let delay = exponential ? baseDelay * Math.pow(2, attempt) : baseDelay;
      delay = Math.min(delay, maxDelay);
      
      // Add jitter to prevent thundering herd
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      await sleep(delay);
    }
  }
  
  throw lastError;
};

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} - Debounced function
 */
const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func.apply(this, args);
  };
};

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Pick specific properties from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to pick
 * @returns {Object} - Object with only picked keys
 */
const pick = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = {};
  keys.forEach(key => {
    if (obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * Omit specific properties from an object
 * @param {Object} obj - Source object
 * @param {Array} keys - Keys to omit
 * @returns {Object} - Object without omitted keys
 */
const omit = (obj, keys) => {
  if (!obj || typeof obj !== 'object') return {};
  
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

/**
 * Flatten a nested object
 * @param {Object} obj - Object to flatten
 * @param {string} prefix - Prefix for keys
 * @returns {Object} - Flattened object
 */
const flattenObject = (obj, prefix = '') => {
  const flattened = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        Object.assign(flattened, flattenObject(obj[key], newKey));
      } else {
        flattened[newKey] = obj[key];
      }
    }
  }
  
  return flattened;
};

/**
 * Group array items by a key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key to group by or function that returns key
 * @returns {Object} - Grouped object
 */
const groupBy = (array, key) => {
  if (!Array.isArray(array)) return {};
  
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
};

module.exports = {
  deepClone,
  isEmpty,
  generateRandomString,
  sleep,
  retryWithBackoff,
  debounce,
  throttle,
  pick,
  omit,
  flattenObject,
  groupBy
};