const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const EventEmitter = require('events');
const logger = require('./logger');

/**
 * Vector Database Configuration for CQ Intelligence
 * 
 * Provides comprehensive vector database operations including:
 * - 1536-dimensional embeddings (Gemini API compatible)
 * - MongoDB Atlas Vector Search integration
 * - Connection pooling and circuit breaker pattern
 * - Caching and performance optimization
 * - Comprehensive monitoring and logging
 */

class VectorDatabase extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Database configuration
      uri: options.uri || process.env.MONGODB_URI,
      database: options.database || process.env.MONGODB_DATABASE || 'Cryptique-Test-Server',
      collection: options.collection || 'vectordocuments',
      
      // Vector configuration
      vectorIndex: {
        name: options.vectorIndexName || 'vector_index',
        dimensions: options.dimensions || 1536,
        similarity: options.similarity || 'cosine',
        path: options.vectorPath || 'embedding'
      },
      
      // Connection pooling
      pooling: {
        minPoolSize: options.minPoolSize || 5,
        maxPoolSize: options.maxPoolSize || 50,
        maxIdleTimeMS: options.maxIdleTimeMS || 30000,
        serverSelectionTimeoutMS: options.serverSelectionTimeoutMS || 5000,
        socketTimeoutMS: options.socketTimeoutMS || 45000,
        connectTimeoutMS: options.connectTimeoutMS || 10000,
        heartbeatFrequencyMS: options.heartbeatFrequencyMS || 10000,
        retryWrites: options.retryWrites !== false,
        retryReads: options.retryReads !== false
      },
      
      // Circuit breaker configuration
      circuitBreaker: {
        failureThreshold: options.failureThreshold || 5,
        resetTimeout: options.resetTimeout || 60000,
        monitoringPeriod: options.monitoringPeriod || 10000,
        expectedErrors: options.expectedErrors || ['MongoNetworkError', 'MongoTimeoutError']
      },
      
      // Caching configuration
      cache: {
        enabled: options.cacheEnabled !== false,
        ttl: options.cacheTTL || 300000, // 5 minutes
        maxSize: options.cacheMaxSize || 1000,
        strategy: options.cacheStrategy || 'lru'
      },
      
      // Performance optimization
      performance: {
        batchSize: options.batchSize || 100,
        maxConcurrency: options.maxConcurrency || 10,
        queryTimeout: options.queryTimeout || 30000,
        indexHint: options.indexHint || true,
        projection: options.projection || { embedding: 0 } // Exclude embeddings by default
      },
      
      // Monitoring configuration
      monitoring: {
        enabled: options.monitoringEnabled !== false,
        metricsInterval: options.metricsInterval || 60000,
        slowQueryThreshold: options.slowQueryThreshold || 1000,
        errorAlertThreshold: options.errorAlertThreshold || 5
      }
    };
    
    // Initialize state
    this.client = null;
    this.db = null;
    this.collection = null;
    this.isConnected = false;
    this.isInitialized = false;
    
    // Circuit breaker state
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    };
    
    // Cache implementation
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
    
    // Performance metrics
    this.metrics = {
      queries: 0,
      totalQueryTime: 0,
      slowQueries: 0,
      errors: 0,
      cacheHitRate: 0,
      avgResponseTime: 0
    };
    
    // Monitoring interval
    this.monitoringInterval = null;
    
    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.updateMetrics = this.updateMetrics.bind(this);
  }
  
  /**
   * Initialize the vector database connection
   */
  async initialize() {
    try {
      logger.info('Initializing Vector Database...');
      
      if (this.isInitialized) {
        logger.warn('Vector Database already initialized');
        return;
      }
      
      // Validate configuration
      await this.validateConfiguration();
      
      // Connect to MongoDB
      await this.connect();
      
      // Setup collections and indexes
      await this.setupCollections();
      
      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
      this.isInitialized = true;
      this.emit('initialized');
      
      logger.info('Vector Database initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Vector Database:', error);
      throw error;
    }
  }
  
  /**
   * Validate configuration parameters
   */
  async validateConfiguration() {
    if (!this.config.uri) {
      throw new Error('MongoDB URI is required');
    }
    
    if (!this.config.database) {
      throw new Error('Database name is required');
    }
    
    if (this.config.vectorIndex.dimensions <= 0) {
      throw new Error('Vector dimensions must be positive');
    }
    
    const validSimilarities = ['cosine', 'euclidean', 'dotProduct'];
    if (!validSimilarities.includes(this.config.vectorIndex.similarity)) {
      throw new Error(`Invalid similarity metric. Must be one of: ${validSimilarities.join(', ')}`);
    }
    
    logger.info('Configuration validation passed');
  }
  
  /**
   * Connect to MongoDB with connection pooling
   */
  async connect() {
    try {
      if (this.isConnected) {
        return;
      }
      
      const options = {
        ...this.config.pooling,
        useNewUrlParser: true,
        useUnifiedTopology: true
      };
      
      this.client = new MongoClient(this.config.uri, options);
      await this.client.connect();
      
      this.db = this.client.db(this.config.database);
      this.collection = this.db.collection(this.config.collection);
      
      this.isConnected = true;
      this.emit('connected');
      
      logger.info(`Connected to MongoDB: ${this.config.database}.${this.config.collection}`);
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
  
  /**
   * Setup collections and indexes
   */
  async setupCollections() {
    try {
      // Create collection if it doesn't exist
      const collections = await this.db.listCollections({ name: this.config.collection }).toArray();
      
      if (collections.length === 0) {
        await this.db.createCollection(this.config.collection, {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['documentId', 'embedding', 'content', 'metadata'],
              properties: {
                documentId: { bsonType: 'string' },
                embedding: { 
                  bsonType: 'array',
                  items: { bsonType: 'double' },
                  minItems: this.config.vectorIndex.dimensions,
                  maxItems: this.config.vectorIndex.dimensions
                },
                content: { bsonType: 'string' },
                metadata: { bsonType: 'object' },
                siteId: { bsonType: 'string' },
                teamId: { bsonType: 'string' },
                sourceType: { bsonType: 'string' },
                status: { bsonType: 'string' },
                createdAt: { bsonType: 'date' },
                updatedAt: { bsonType: 'date' }
              }
            }
          }
        });
        
        logger.info(`Created collection: ${this.config.collection}`);
      }
      
      // Create indexes
      await this.createIndexes();
      
    } catch (error) {
      logger.error('Failed to setup collections:', error);
      throw error;
    }
  }
  
  /**
   * Create necessary indexes for vector operations
   */
  async createIndexes() {
    try {
      const indexes = [
        // Compound indexes for filtering
        { key: { siteId: 1, teamId: 1, status: 1 }, name: 'siteId_teamId_status' },
        { key: { teamId: 1, sourceType: 1, createdAt: -1 }, name: 'teamId_sourceType_createdAt' },
        { key: { siteId: 1, status: 1, updatedAt: -1 }, name: 'siteId_status_updatedAt' },
        { key: { documentId: 1 }, name: 'documentId', unique: true },
        
        // Text indexes for hybrid search
        { key: { content: 'text', 'metadata.title': 'text' }, name: 'content_text' },
        
        // TTL index for data retention
        { key: { createdAt: 1 }, name: 'ttl_index', expireAfterSeconds: 7776000 }, // 90 days
        
        // Performance indexes
        { key: { status: 1, createdAt: -1 }, name: 'status_createdAt' },
        { key: { 'metadata.timeframe': 1, siteId: 1 }, name: 'timeframe_siteId' }
      ];
      
      for (const index of indexes) {
        try {
          await this.collection.createIndex(index.key, {
            name: index.name,
            background: true,
            unique: index.unique || false,
            expireAfterSeconds: index.expireAfterSeconds
          });
          
          logger.info(`Created index: ${index.name}`);
        } catch (error) {
          if (error.code !== 85) { // Index already exists
            logger.warn(`Failed to create index ${index.name}:`, error.message);
          }
        }
      }
      
      logger.info('Indexes setup completed');
      
    } catch (error) {
      logger.error('Failed to create indexes:', error);
      throw error;
    }
  }
  
  /**
   * Perform vector similarity search
   */
  async vectorSearch(queryVector, options = {}) {
    const startTime = Date.now();
    
    try {
      // Circuit breaker check
      if (!this.checkCircuitBreaker()) {
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Validate query vector
      if (!Array.isArray(queryVector) || queryVector.length !== this.config.vectorIndex.dimensions) {
        throw new Error(`Query vector must be an array of ${this.config.vectorIndex.dimensions} dimensions`);
      }
      
      // Check cache
      const cacheKey = this.generateCacheKey('vectorSearch', queryVector, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.updateMetrics(startTime, false);
        return cached;
      }
      
      // Build aggregation pipeline
      const pipeline = [
        {
          $vectorSearch: {
            index: this.config.vectorIndex.name,
            path: this.config.vectorIndex.path,
            queryVector: queryVector,
            numCandidates: options.numCandidates || 100,
            limit: options.limit || 10,
            filter: options.filter || {}
          }
        }
      ];
      
      // Add score projection
      pipeline.push({
        $addFields: {
          score: { $meta: 'vectorSearchScore' }
        }
      });
      
      // Add projection to exclude embeddings if not needed
      if (options.includeEmbeddings !== true) {
        pipeline.push({
          $project: { embedding: 0 }
        });
      }
      
      // Execute search
      const results = await this.collection.aggregate(pipeline).toArray();
      
      // Cache results
      this.setCache(cacheKey, results);
      
      // Update metrics
      this.updateMetrics(startTime, false);
      
      logger.debug(`Vector search completed: ${results.length} results in ${Date.now() - startTime}ms`);
      
      return results;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Perform hybrid search (vector + text)
   */
  async hybridSearch(queryVector, textQuery, options = {}) {
    const startTime = Date.now();
    
    try {
      // Circuit breaker check
      if (!this.checkCircuitBreaker()) {
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Check cache
      const cacheKey = this.generateCacheKey('hybridSearch', { queryVector, textQuery }, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.updateMetrics(startTime, false);
        return cached;
      }
      
      // Perform vector search
      const vectorResults = await this.vectorSearch(queryVector, {
        ...options,
        limit: options.vectorLimit || 20
      });
      
      // Perform text search
      const textResults = await this.textSearch(textQuery, {
        ...options,
        limit: options.textLimit || 20
      });
      
      // Combine and rank results
      const combinedResults = this.combineSearchResults(vectorResults, textResults, options);
      
      // Cache results
      this.setCache(cacheKey, combinedResults);
      
      // Update metrics
      this.updateMetrics(startTime, false);
      
      return combinedResults;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Perform text search
   */
  async textSearch(query, options = {}) {
    const startTime = Date.now();
    
    try {
      const filter = {
        $text: { $search: query },
        ...options.filter
      };
      
      const results = await this.collection
        .find(filter)
        .project({ 
          ...this.config.performance.projection,
          score: { $meta: 'textScore' }
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || 10)
        .toArray();
      
      this.updateMetrics(startTime, false);
      
      return results;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Insert vector document
   */
  async insertDocument(document) {
    const startTime = Date.now();
    
    try {
      // Validate document
      if (!document.embedding || !Array.isArray(document.embedding)) {
        throw new Error('Document must have a valid embedding array');
      }
      
      if (document.embedding.length !== this.config.vectorIndex.dimensions) {
        throw new Error(`Embedding must have ${this.config.vectorIndex.dimensions} dimensions`);
      }
      
      // Add timestamps
      const now = new Date();
      const docToInsert = {
        ...document,
        createdAt: now,
        updatedAt: now,
        status: document.status || 'active'
      };
      
      // Insert document
      const result = await this.collection.insertOne(docToInsert);
      
      // Clear related cache entries
      this.clearCacheByPattern('vectorSearch');
      this.clearCacheByPattern('hybridSearch');
      
      this.updateMetrics(startTime, false);
      
      return result;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Update vector document
   */
  async updateDocument(documentId, updates) {
    const startTime = Date.now();
    
    try {
      const updateDoc = {
        ...updates,
        updatedAt: new Date()
      };
      
      const result = await this.collection.updateOne(
        { documentId },
        { $set: updateDoc }
      );
      
      // Clear related cache entries
      this.clearCacheByPattern('vectorSearch');
      this.clearCacheByPattern('hybridSearch');
      
      this.updateMetrics(startTime, false);
      
      return result;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Delete vector document
   */
  async deleteDocument(documentId) {
    const startTime = Date.now();
    
    try {
      const result = await this.collection.deleteOne({ documentId });
      
      // Clear related cache entries
      this.clearCacheByPattern('vectorSearch');
      this.clearCacheByPattern('hybridSearch');
      
      this.updateMetrics(startTime, false);
      
      return result;
      
    } catch (error) {
      this.handleError(error);
      this.updateMetrics(startTime, true);
      throw error;
    }
  }
  
  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const stats = await this.db.stats();
      const collectionCount = await this.collection.countDocuments();
      const indexes = await this.collection.indexes();
      
      return {
        database: {
          name: this.config.database,
          collections: stats.collections || 0,
          dataSize: stats.dataSize || 0,
          indexSize: stats.indexSize || 0,
          storageSize: stats.storageSize || 0
        },
        collection: {
          name: this.config.collection,
          count: collectionCount,
          indexCount: indexes.length
        },
        indexes: indexes,
        performance: this.metrics,
        cache: this.cacheStats,
        circuitBreaker: this.circuitBreaker
      };
      
    } catch (error) {
      logger.error('Failed to get stats:', error);
      throw error;
    }
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        throw new Error('Database not connected');
      }
      
      // Test database connectivity
      await this.db.admin().ping();
      
      // Test collection access
      await this.collection.findOne({}, { projection: { _id: 1 } });
      
      // Check indexes
      const indexes = await this.collection.indexes();
      const hasVectorIndex = indexes.some(idx => idx.name === this.config.vectorIndex.name);
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        initialized: this.isInitialized,
        vectorIndexExists: hasVectorIndex,
        circuitBreakerState: this.circuitBreaker.state,
        metrics: this.metrics,
        timestamp: new Date()
      };
      
    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Circuit breaker implementation
   */
  checkCircuitBreaker() {
    const now = Date.now();
    
    switch (this.circuitBreaker.state) {
      case 'OPEN':
        if (now >= this.circuitBreaker.nextAttemptTime) {
          this.circuitBreaker.state = 'HALF_OPEN';
          logger.info('Circuit breaker moved to HALF_OPEN');
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        return true;
        
      case 'CLOSED':
      default:
        return true;
    }
  }
  
  /**
   * Handle errors and update circuit breaker
   */
  handleError(error) {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failures >= this.config.circuitBreaker.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreaker.resetTimeout;
      
      logger.error('Circuit breaker opened due to repeated failures');
      this.emit('circuitBreakerOpen', error);
    }
    
    logger.error('Vector database error:', error);
    this.emit('error', error);
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics(startTime, isError = false) {
    const duration = Date.now() - startTime;
    
    this.metrics.queries++;
    this.metrics.totalQueryTime += duration;
    this.metrics.avgResponseTime = this.metrics.totalQueryTime / this.metrics.queries;
    
    if (isError) {
      this.metrics.errors++;
    }
    
    if (duration > this.config.monitoring.slowQueryThreshold) {
      this.metrics.slowQueries++;
    }
    
    // Update cache hit rate
    const totalCacheRequests = this.cacheStats.hits + this.cacheStats.misses;
    this.metrics.cacheHitRate = totalCacheRequests > 0 ? this.cacheStats.hits / totalCacheRequests : 0;
  }
  
  /**
   * Cache management
   */
  generateCacheKey(operation, params, options) {
    return `${operation}:${JSON.stringify(params)}:${JSON.stringify(options)}`;
  }
  
  getFromCache(key) {
    if (!this.config.cache.enabled) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cache.ttl) {
      this.cacheStats.hits++;
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    this.cacheStats.misses++;
    return null;
  }
  
  setCache(key, data) {
    if (!this.config.cache.enabled) return;
    
    // Implement LRU eviction
    if (this.cache.size >= this.config.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheStats.evictions++;
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  clearCacheByPattern(pattern) {
    if (!this.config.cache.enabled) return;
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Combine search results for hybrid search
   */
  combineSearchResults(vectorResults, textResults, options = {}) {
    const vectorWeight = options.vectorWeight || 0.7;
    const textWeight = options.textWeight || 0.3;
    
    const combinedMap = new Map();
    
    // Add vector results
    vectorResults.forEach((result, index) => {
      const score = (result.score || 0) * vectorWeight;
      combinedMap.set(result.documentId, {
        ...result,
        combinedScore: score,
        vectorRank: index + 1,
        textRank: null
      });
    });
    
    // Add text results
    textResults.forEach((result, index) => {
      const score = (result.score || 0) * textWeight;
      const existing = combinedMap.get(result.documentId);
      
      if (existing) {
        existing.combinedScore += score;
        existing.textRank = index + 1;
      } else {
        combinedMap.set(result.documentId, {
          ...result,
          combinedScore: score,
          vectorRank: null,
          textRank: index + 1
        });
      }
    });
    
    // Sort by combined score and return
    return Array.from(combinedMap.values())
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, options.limit || 10);
  }
  
  /**
   * Start monitoring
   */
  startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.monitoringInterval = setInterval(() => {
      this.emit('metrics', this.metrics);
      
      // Reset circuit breaker if no recent failures
      if (this.circuitBreaker.state === 'HALF_OPEN' && 
          Date.now() - this.circuitBreaker.lastFailureTime > this.config.circuitBreaker.resetTimeout) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failures = 0;
        logger.info('Circuit breaker reset to CLOSED');
      }
      
    }, this.config.monitoring.metricsInterval);
  }
  
  /**
   * Shutdown the vector database
   */
  async shutdown() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
      if (this.client) {
        await this.client.close();
      }
      
      this.isConnected = false;
      this.isInitialized = false;
      this.emit('shutdown');
      
      logger.info('Vector Database shutdown completed');
      
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
}

// Create singleton instance
const vectorDatabase = new VectorDatabase();

module.exports = {
  VectorDatabase,
  vectorDatabase
}; 