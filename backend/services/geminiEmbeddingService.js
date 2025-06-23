const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const EventEmitter = require('events');

class GeminiEmbeddingService extends EventEmitter {
  constructor() {
    super();
    
    // Initialize Gemini AI client
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Cache for embeddings (TTL: 1 hour)
    this.cache = new NodeCache({ 
      stdTTL: 3600, // 1 hour
      checkperiod: 600, // Check for expired keys every 10 minutes
      maxKeys: 10000 // Maximum number of cached embeddings
    });
    
    // Rate limiting configuration
    this.rateLimiter = {
      requestsPerMinute: 60, // Gemini API limit
      requestsPerDay: 1000,  // Daily quota
      currentMinuteRequests: 0,
      currentDayRequests: 0,
      minuteResetTime: Date.now() + 60000,
      dayResetTime: Date.now() + 86400000
    };
    
    // Connection pool for API requests
    this.connectionPool = {
      maxConcurrent: 5,
      currentConnections: 0,
      queue: [],
      retryDelay: 1000,
      maxRetries: 3
    };
    
    // Statistics tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalTokensUsed: 0,
      totalCost: 0,
      averageResponseTime: 0,
      rateLimitHits: 0,
      lastResetTime: Date.now()
    };
    
    // Error tracking
    this.errors = {
      rateLimitErrors: 0,
      apiErrors: 0,
      networkErrors: 0,
      validationErrors: 0,
      lastErrorTime: null,
      lastError: null
    };
    
    // Start cleanup and monitoring intervals
    this.startMonitoring();
  }
  
  /**
   * Generate embedding for text content
   * @param {string} text - Text to embed
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Embedding result
   */
  async generateEmbedding(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      this.validateInput(text, options);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(text, options);
      const cachedResult = this.cache.get(cacheKey);
      
      if (cachedResult) {
        this.stats.cacheHits++;
        this.emit('cacheHit', { text: text.substring(0, 100), cacheKey });
        return cachedResult;
      }
      
      this.stats.cacheMisses++;
      
      // Check rate limits
      await this.checkRateLimit();
      
      // Wait for available connection
      await this.waitForConnection();
      
      // Generate embedding
      const result = await this.callGeminiAPI(text, options);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      // Update statistics
      this.updateStats(startTime, result, true);
      
      this.emit('embeddingGenerated', {
        textLength: text.length,
        responseTime: Date.now() - startTime,
        tokensUsed: result.tokensUsed
      });
      
      return result;
      
    } catch (error) {
      this.updateStats(startTime, null, false);
      this.handleError(error);
      throw error;
    } finally {
      this.releaseConnection();
    }
  }
  
  /**
   * Generate embeddings for multiple texts in batch
   * @param {Array<string>} texts - Array of texts to embed
   * @param {Object} options - Configuration options
   * @returns {Promise<Array>} Array of embedding results
   */
  async generateBatchEmbeddings(texts, options = {}) {
    const batchSize = options.batchSize || 10;
    const results = [];
    const errors = [];
    
    // Process in batches to respect rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(async (text, index) => {
        try {
          const result = await this.generateEmbedding(text, options);
          return { index: i + index, result, error: null };
        } catch (error) {
          return { index: i + index, result: null, error };
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(({ value }) => {
        if (value.error) {
          errors.push({ index: value.index, error: value.error });
        } else {
          results[value.index] = value.result;
        }
      });
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < texts.length) {
        await this.delay(1000); // 1 second delay between batches
      }
    }
    
    this.emit('batchProcessed', {
      totalTexts: texts.length,
      successful: results.filter(r => r).length,
      failed: errors.length
    });
    
    return { results, errors };
  }
  
  /**
   * Validate input parameters
   * @param {string} text - Text to validate
   * @param {Object} options - Options to validate
   */
  validateInput(text, options) {
    if (!text || typeof text !== 'string') {
      this.errors.validationErrors++;
      throw new Error('Text must be a non-empty string');
    }
    
    if (text.length > 8000) {
      this.errors.validationErrors++;
      throw new Error('Text length exceeds maximum limit of 8000 characters');
    }
    
    if (text.trim().length === 0) {
      this.errors.validationErrors++;
      throw new Error('Text cannot be empty or only whitespace');
    }
    
    // Validate options
    if (options.model && !['embedding-001'].includes(options.model)) {
      this.errors.validationErrors++;
      throw new Error('Invalid embedding model specified');
    }
  }
  
  /**
   * Generate cache key for text and options
   * @param {string} text - Text content
   * @param {Object} options - Embedding options
   * @returns {string} Cache key
   */
  generateCacheKey(text, options) {
    const crypto = require('crypto');
    const content = JSON.stringify({ text, options });
    return crypto.createHash('sha256').update(content).digest('hex');
  }
  
  /**
   * Check and enforce rate limits
   */
  async checkRateLimit() {
    const now = Date.now();
    
    // Reset minute counter if needed
    if (now > this.rateLimiter.minuteResetTime) {
      this.rateLimiter.currentMinuteRequests = 0;
      this.rateLimiter.minuteResetTime = now + 60000;
    }
    
    // Reset day counter if needed
    if (now > this.rateLimiter.dayResetTime) {
      this.rateLimiter.currentDayRequests = 0;
      this.rateLimiter.dayResetTime = now + 86400000;
    }
    
    // Check limits
    if (this.rateLimiter.currentMinuteRequests >= this.rateLimiter.requestsPerMinute) {
      this.stats.rateLimitHits++;
      const waitTime = this.rateLimiter.minuteResetTime - now;
      this.emit('rateLimitHit', { type: 'minute', waitTime });
      await this.delay(waitTime);
    }
    
    if (this.rateLimiter.currentDayRequests >= this.rateLimiter.requestsPerDay) {
      this.stats.rateLimitHits++;
      const waitTime = this.rateLimiter.dayResetTime - now;
      this.emit('rateLimitHit', { type: 'day', waitTime });
      throw new Error(`Daily rate limit exceeded. Reset in ${Math.ceil(waitTime / 3600000)} hours`);
    }
    
    // Increment counters
    this.rateLimiter.currentMinuteRequests++;
    this.rateLimiter.currentDayRequests++;
  }
  
  /**
   * Wait for available connection in pool
   */
  async waitForConnection() {
    return new Promise((resolve) => {
      if (this.connectionPool.currentConnections < this.connectionPool.maxConcurrent) {
        this.connectionPool.currentConnections++;
        resolve();
      } else {
        this.connectionPool.queue.push(resolve);
      }
    });
  }
  
  /**
   * Release connection back to pool
   */
  releaseConnection() {
    this.connectionPool.currentConnections--;
    
    if (this.connectionPool.queue.length > 0) {
      const nextRequest = this.connectionPool.queue.shift();
      this.connectionPool.currentConnections++;
      nextRequest();
    }
  }
  
  /**
   * Call Gemini API to generate embedding
   * @param {string} text - Text to embed
   * @param {Object} options - API options
   * @returns {Promise<Object>} API response
   */
  async callGeminiAPI(text, options, retryCount = 0) {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: options.model || 'embedding-001' 
      });
      
      const startTime = Date.now();
      
      // Generate embedding
      const result = await model.embedContent(text);
      
      const responseTime = Date.now() - startTime;
      
      // Extract embedding vector
      const embedding = result.embedding.values;
      
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error('Invalid embedding response from Gemini API');
      }
      
      // Estimate token usage (approximate)
      const tokensUsed = Math.ceil(text.length / 4);
      
      // Estimate cost (approximate - update with actual Gemini pricing)
      const cost = tokensUsed * 0.0001; // $0.0001 per 1K tokens (example)
      
      return {
        embedding,
        tokensUsed,
        cost,
        responseTime,
        model: options.model || 'embedding-001',
        dimensions: embedding.length,
        confidence: 1.0 // Gemini doesn't provide confidence scores
      };
      
    } catch (error) {
      // Handle retries for transient errors
      if (retryCount < this.connectionPool.maxRetries && this.isRetryableError(error)) {
        const delay = this.connectionPool.retryDelay * Math.pow(2, retryCount);
        await this.delay(delay);
        return this.callGeminiAPI(text, options, retryCount + 1);
      }
      
      this.errors.apiErrors++;
      this.errors.lastError = error;
      this.errors.lastErrorTime = Date.now();
      
      throw error;
    }
  }
  
  /**
   * Check if error is retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN'
    ];
    
    const retryableStatusCodes = [429, 500, 502, 503, 504];
    
    return (
      retryableErrors.some(code => error.code === code) ||
      retryableStatusCodes.some(status => error.status === status) ||
      error.message.includes('rate limit') ||
      error.message.includes('timeout')
    );
  }
  
  /**
   * Update service statistics
   * @param {number} startTime - Request start time
   * @param {Object} result - API result
   * @param {boolean} success - Whether request was successful
   */
  updateStats(startTime, result, success) {
    this.stats.totalRequests++;
    
    if (success) {
      this.stats.successfulRequests++;
      
      if (result) {
        this.stats.totalTokensUsed += result.tokensUsed || 0;
        this.stats.totalCost += result.cost || 0;
        
        // Update average response time
        const responseTime = Date.now() - startTime;
        this.stats.averageResponseTime = (
          (this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime) /
          this.stats.successfulRequests
        );
      }
    } else {
      this.stats.failedRequests++;
    }
  }
  
  /**
   * Handle errors and emit events
   * @param {Error} error - Error to handle
   */
  handleError(error) {
    this.errors.lastError = error;
    this.errors.lastErrorTime = Date.now();
    
    if (error.message.includes('rate limit')) {
      this.errors.rateLimitErrors++;
    } else if (error.code && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
      this.errors.networkErrors++;
    } else {
      this.errors.apiErrors++;
    }
    
    this.emit('error', {
      error: error.message,
      type: this.categorizeError(error),
      timestamp: Date.now()
    });
  }
  
  /**
   * Categorize error type
   * @param {Error} error - Error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (error.message.includes('rate limit')) return 'rate_limit';
    if (error.message.includes('validation')) return 'validation';
    if (error.code && ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) return 'network';
    return 'api';
  }
  
  /**
   * Get service statistics
   * @returns {Object} Current statistics
   */
  getStats() {
    return {
      ...this.stats,
      errors: { ...this.errors },
      rateLimiter: {
        currentMinuteRequests: this.rateLimiter.currentMinuteRequests,
        currentDayRequests: this.rateLimiter.currentDayRequests,
        minuteResetTime: this.rateLimiter.minuteResetTime,
        dayResetTime: this.rateLimiter.dayResetTime
      },
      connectionPool: {
        currentConnections: this.connectionPool.currentConnections,
        queueLength: this.connectionPool.queue.length
      },
      cache: {
        keys: this.cache.keys().length,
        hits: this.stats.cacheHits,
        misses: this.stats.cacheMisses,
        hitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) * 100
      }
    };
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.flushAll();
    this.emit('cacheCleared');
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    Object.keys(this.stats).forEach(key => {
      if (typeof this.stats[key] === 'number') {
        this.stats[key] = 0;
      }
    });
    this.stats.lastResetTime = Date.now();
    
    Object.keys(this.errors).forEach(key => {
      if (typeof this.errors[key] === 'number') {
        this.errors[key] = 0;
      }
    });
    
    this.emit('statsReset');
  }
  
  /**
   * Start monitoring and cleanup intervals
   */
  startMonitoring() {
    // Emit stats every minute
    setInterval(() => {
      this.emit('stats', this.getStats());
    }, 60000);
    
    // Clean up old errors every hour
    setInterval(() => {
      const oneHourAgo = Date.now() - 3600000;
      if (this.errors.lastErrorTime && this.errors.lastErrorTime < oneHourAgo) {
        this.errors.lastError = null;
        this.errors.lastErrorTime = null;
      }
    }, 3600000);
  }
  
  /**
   * Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Health check
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      // Test with a simple embedding
      const testResult = await this.generateEmbedding('health check test');
      
      return {
        status: 'healthy',
        timestamp: Date.now(),
        stats: this.getStats(),
        testEmbedding: {
          dimensions: testResult.embedding.length,
          responseTime: testResult.responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: Date.now(),
        error: error.message,
        stats: this.getStats()
      };
    }
  }
}

// Create singleton instance
const geminiEmbeddingService = new GeminiEmbeddingService();

module.exports = geminiEmbeddingService; 