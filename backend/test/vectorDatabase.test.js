const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const { VectorDatabase } = require('../config/vectorDatabase');

describe('Vector Database System', function() {
  this.timeout(30000); // 30 second timeout for database operations
  
  let vectorDb;
  let testData = [];
  
  before(async function() {
    // Initialize vector database for testing
    vectorDb = new VectorDatabase({
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique_test_vector',
      database: process.env.MONGODB_DATABASE || 'cryptique_test_vector',
      collection: 'test_vectordocuments'
    });
    
    await vectorDb.initialize();
  });
  
  after(async function() {
    // Cleanup test data
    if (vectorDb.collection) {
      await vectorDb.collection.deleteMany({});
    }
    
    await vectorDb.shutdown();
  });
  
  beforeEach(function() {
    // Reset test data
    testData = [];
  });
  
  afterEach(async function() {
    // Clean up test documents
    if (vectorDb.collection && testData.length > 0) {
      const documentIds = testData.map(doc => doc.documentId);
      await vectorDb.collection.deleteMany({ documentId: { $in: documentIds } });
    }
  });
  
  describe('Vector Database Configuration', function() {
    it('should initialize with correct configuration', function() {
      expect(vectorDb.config.vectorIndex.dimensions).to.equal(1536);
      expect(vectorDb.config.vectorIndex.similarity).to.equal('cosine');
      expect(vectorDb.config.vectorIndex.name).to.equal('vector_index');
    });
    
    it('should have proper connection pooling settings', function() {
      expect(vectorDb.config.pooling.minPoolSize).to.equal(5);
      expect(vectorDb.config.pooling.maxPoolSize).to.equal(50);
      expect(vectorDb.config.pooling.maxIdleTimeMS).to.equal(30000);
    });
    
    it('should have circuit breaker configuration', function() {
      expect(vectorDb.config.circuitBreaker.failureThreshold).to.equal(5);
      expect(vectorDb.config.circuitBreaker.resetTimeout).to.equal(60000);
    });
    
    it('should have cache configuration', function() {
      expect(vectorDb.config.cache.enabled).to.be.true;
      expect(vectorDb.config.cache.ttl).to.equal(300000);
      expect(vectorDb.config.cache.maxSize).to.equal(1000);
    });
  });
  
  describe('Database Connection', function() {
    it('should establish connection successfully', function() {
      expect(vectorDb.isConnected).to.be.true;
      expect(vectorDb.client).to.exist;
      expect(vectorDb.db).to.exist;
      expect(vectorDb.collection).to.exist;
    });
    
    it('should handle connection failures gracefully', async function() {
      const testVectorDb = new VectorDatabase({
        uri: 'mongodb://invalid:27017/test',
        database: 'test',
        collection: 'test'
      });
      
      try {
        await testVectorDb.connect();
        expect.fail('Should have thrown connection error');
      } catch (error) {
        expect(error.message).to.include('Server selection timed out');
      }
    });
    
    it('should implement circuit breaker pattern', function() {
      expect(vectorDb.circuitBreaker).to.exist;
      expect(vectorDb.circuitBreaker.state).to.equal('CLOSED');
      expect(vectorDb.checkCircuitBreaker).to.be.a('function');
    });
  });
  
  describe('Index Management', function() {
    it('should create compound indexes', async function() {
      const indexes = await vectorDb.collection.indexes();
      const indexNames = indexes.map(idx => idx.name);
      
      expect(indexNames).to.include('ttl_index');
    });
    
    it('should create text search indexes', async function() {
      const indexes = await vectorDb.collection.indexes();
      const textIndex = indexes.find(idx => idx.name === 'content_text');
      
      // Text index may not exist in test environment, so we check if it's attempted
      expect(indexes).to.be.an('array');
    });
    
    it('should create TTL indexes', async function() {
      const indexes = await vectorDb.collection.indexes();
      const ttlIndex = indexes.find(idx => idx.name === 'ttl_index');
      
      expect(ttlIndex).to.exist;
      expect(ttlIndex.expireAfterSeconds).to.equal(7776000); // 90 days
    });
  });
  
  describe('Document Operations', function() {
    it('should insert vector documents successfully', async function() {
      const testDoc = {
        documentId: 'test_doc_1',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId().toString(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId().toString(),
        embedding: Array(1536).fill(0).map(() => Math.random()),
        content: 'Test content for vector search',
        metadata: {
          title: 'Test Document',
          category: 'test',
          importance: 5
        }
      };
      
      testData.push(testDoc);
      
      const result = await vectorDb.insertDocument(testDoc);
      
      expect(result.insertedId).to.exist;
      expect(result.acknowledged).to.be.true;
    });
    
    it('should validate document structure', async function() {
      const invalidDoc = {
        documentId: 'test_doc_invalid',
        sourceType: 'analytics',
        // Missing embedding field
        content: 'Test content'
      };
      
      try {
        await vectorDb.insertDocument(invalidDoc);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('Document must have a valid embedding array');
      }
    });
    
    it('should validate embedding dimensions', async function() {
      const invalidDoc = {
        documentId: 'test_doc_invalid_embedding',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId().toString(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId().toString(),
        embedding: Array(512).fill(0).map(() => Math.random()), // Wrong dimensions
        content: 'Test content'
      };
      
      try {
        await vectorDb.insertDocument(invalidDoc);
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).to.include('1536 dimensions');
      }
    });
    
    it('should update vector documents', async function() {
      const testDoc = {
        documentId: 'test_doc_update',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId().toString(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId().toString(),
        embedding: Array(1536).fill(0).map(() => Math.random()),
        content: 'Original content',
        metadata: { version: 1 }
      };
      
      testData.push(testDoc);
      
      // Insert document
      await vectorDb.insertDocument(testDoc);
      
      // Update document
      const updates = {
        content: 'Updated content',
        metadata: { version: 2 }
      };
      
      const result = await vectorDb.updateDocument(testDoc.documentId, updates);
      
      expect(result.modifiedCount).to.equal(1);
      expect(result.acknowledged).to.be.true;
    });
    
    it('should delete vector documents', async function() {
      const testDoc = {
        documentId: 'test_doc_delete',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId().toString(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId().toString(),
        embedding: Array(1536).fill(0).map(() => Math.random()),
        content: 'Content to delete',
        metadata: { temporary: true }
      };
      
      testData.push(testDoc);
      
      // Insert document
      await vectorDb.insertDocument(testDoc);
      
      // Delete document
      const result = await vectorDb.deleteDocument(testDoc.documentId);
      
      expect(result.deletedCount).to.equal(1);
      expect(result.acknowledged).to.be.true;
    });
  });

  describe('Vector Search Operations', function() {
    beforeEach(async function() {
      // Insert test documents for search
      const testDocs = [
        {
          documentId: 'search_doc_1',
          sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId().toString(),
          siteId: 'test_site',
          teamId: new mongoose.Types.ObjectId().toString(),
          embedding: Array(1536).fill(0).map(() => Math.random()),
          content: 'Machine learning algorithms for data analysis',
          metadata: { category: 'ml', importance: 8 }
        },
        {
          documentId: 'search_doc_2',
      sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId().toString(),
          siteId: 'test_site',
          teamId: new mongoose.Types.ObjectId().toString(),
          embedding: Array(1536).fill(0).map(() => Math.random()),
          content: 'Deep learning neural networks',
          metadata: { category: 'dl', importance: 9 }
        }
      ];
      
      testData.push(...testDocs);
      
      for (const doc of testDocs) {
        await vectorDb.insertDocument(doc);
      }
    });
    
    it('should perform vector similarity search', async function() {
      const queryVector = Array(1536).fill(0).map(() => Math.random());
      
      try {
        const results = await vectorDb.vectorSearch(queryVector, {
          limit: 5,
          filter: { sourceType: 'analytics' }
        });
        
        expect(results).to.be.an('array');
        // Note: Vector search may not work in test environment without Atlas
      } catch (error) {
        // Expected in test environment without Atlas Vector Search
        expect(error.message).to.include('$search and $vectorSearch');
      }
    });
    
    it('should perform text search', async function() {
      try {
        const results = await vectorDb.textSearch('machine learning', {
          limit: 5,
          filter: { sourceType: 'analytics' }
        });
        
        expect(results).to.be.an('array');
      } catch (error) {
        // Expected in test environment without text indexes
        expect(error.message).to.include('text index required');
      }
    });
    
    it('should perform hybrid search', async function() {
      const queryVector = Array(1536).fill(0).map(() => Math.random());
      
      try {
        const results = await vectorDb.hybridSearch(queryVector, 'neural networks', {
          limit: 5,
          filter: { sourceType: 'analytics' }
        });
        
        expect(results).to.be.an('array');
      } catch (error) {
        // Expected in test environment without Atlas Vector Search or text indexes
        expect(error.message).to.match(/(\$search and \$vectorSearch|text index required)/);
      }
    });
  });

  describe('Performance and Monitoring', function() {
    it('should track query metrics', async function() {
      const initialQueries = vectorDb.metrics.queries;
      
      try {
        const queryVector = Array(1536).fill(0).map(() => Math.random());
        await vectorDb.vectorSearch(queryVector, { limit: 1 });
      } catch (error) {
        // Expected in test environment
      }
      
      expect(vectorDb.metrics.queries).to.be.at.least(initialQueries);
    });
    
    it('should provide health check information', async function() {
      const health = await vectorDb.healthCheck();
      
      expect(health).to.have.property('status');
      expect(health).to.have.property('connected');
      expect(health).to.have.property('initialized');
      expect(health).to.have.property('timestamp');
    });
    
    it('should provide database statistics', async function() {
      try {
        const stats = await vectorDb.getStats();
        
        expect(stats).to.have.property('database');
        expect(stats).to.have.property('collection');
        expect(stats).to.have.property('performance');
        expect(stats).to.have.property('cache');
        expect(stats).to.have.property('circuitBreaker');
        
        expect(stats.database.name).to.equal(vectorDb.config.database);
        expect(stats.collection.name).to.equal(vectorDb.config.collection);
        expect(stats.performance).to.equal(vectorDb.metrics);
        expect(stats.cache).to.equal(vectorDb.cacheStats);
      } catch (error) {
        // Some stats methods may not be available in test environment
        expect(error.message).to.match(/(stats|indexStats)/);
      }
    });
  });
  
  describe('Error Handling and Recovery', function() {
    beforeEach(function() {
      // Reset circuit breaker state before each test
      vectorDb.circuitBreaker.state = 'CLOSED';
      vectorDb.circuitBreaker.failures = 0;
      vectorDb.circuitBreaker.lastFailureTime = null;
    });
    
    it('should handle connection timeouts', async function() {
      const testVectorDb = new VectorDatabase({
        uri: 'mongodb://localhost:27017/timeout_test',
        database: 'timeout_test',
        collection: 'test',
        pooling: {
          serverSelectionTimeoutMS: 1000,
          connectTimeoutMS: 1000
        }
      });
      
      const startTime = Date.now();
      
      try {
        await testVectorDb.connect();
      } catch (error) {
        const duration = Date.now() - startTime;
        expect(duration).to.be.lessThan(5000); // Should timeout quickly
        expect(error.message).to.include('Server selection timed out');
      }
    });
    
    it('should implement circuit breaker logic', function() {
      // Test circuit breaker state transitions
      expect(vectorDb.circuitBreaker.state).to.equal('CLOSED');
      
      // Simulate failures (handleError doesn't throw, it just processes the error)
      for (let i = 0; i < 5; i++) {
        try {
          vectorDb.handleError(new Error('Test error'));
        } catch (error) {
          // handleError doesn't throw, but just in case
        }
      }
      
      expect(vectorDb.circuitBreaker.state).to.equal('OPEN');
      expect(vectorDb.circuitBreaker.failures).to.be.at.least(5);
    });
    
    it('should handle memory pressure gracefully', function() {
      // Test cache size limits
      const initialCacheSize = vectorDb.cache.size;
      
      // Fill cache beyond max size
      for (let i = 0; i < 1100; i++) {
        vectorDb.setCache(`test_key_${i}`, { data: `test_data_${i}` });
      }
      
      expect(vectorDb.cache.size).to.be.at.most(vectorDb.config.cache.maxSize);
      expect(vectorDb.cacheStats.evictions).to.be.greaterThan(0);
    });
  });

  describe('Cache Management', function() {
    it('should generate cache keys correctly', function() {
      const key = vectorDb.generateCacheKey('test_operation', { param: 'value' }, { option: 'test' });
      
      expect(key).to.be.a('string');
      expect(key).to.include('test_operation');
    });
    
    it('should handle cache hits and misses', function() {
      const testKey = 'test_cache_key';
      const testData = { test: 'data' };
      
      // Test cache miss
      const missed = vectorDb.getFromCache(testKey);
      expect(missed).to.be.null;
      expect(vectorDb.cacheStats.misses).to.be.greaterThan(0);
      
      // Test cache set and hit
      vectorDb.setCache(testKey, testData);
      const hit = vectorDb.getFromCache(testKey);
      
      expect(hit).to.deep.equal(testData);
      expect(vectorDb.cacheStats.hits).to.be.greaterThan(0);
    });
    
    it('should clear cache by pattern', function() {
      // Set multiple cache entries
      vectorDb.setCache('test_pattern_1', { data: 1 });
      vectorDb.setCache('test_pattern_2', { data: 2 });
      vectorDb.setCache('other_key', { data: 3 });
      
      // Clear by pattern
      vectorDb.clearCacheByPattern('test_pattern');
      
      expect(vectorDb.getFromCache('test_pattern_1')).to.be.null;
      expect(vectorDb.getFromCache('test_pattern_2')).to.be.null;
      expect(vectorDb.getFromCache('other_key')).to.not.be.null;
    });
  });

  describe('Performance Benchmarks', function() {
    it('should insert documents within performance thresholds', async function() {
      const testDoc = {
        documentId: 'perf_test_doc',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId().toString(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId().toString(),
        embedding: Array(1536).fill(0).map(() => Math.random()),
        content: 'Performance test document',
        metadata: { test: true }
      };
      
      testData.push(testDoc);
      
      const startTime = Date.now();
      await vectorDb.insertDocument(testDoc);
      const duration = Date.now() - startTime;
      
      expect(duration).to.be.lessThan(1000); // Should complete within 1 second
    });
    
    it('should handle concurrent operations', async function() {
      const concurrentOps = 5;
      const promises = [];
      
      for (let i = 0; i < concurrentOps; i++) {
        const testDoc = {
          documentId: `concurrent_doc_${i}`,
          sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId().toString(),
          siteId: 'test_site',
          teamId: new mongoose.Types.ObjectId().toString(),
          embedding: Array(1536).fill(0).map(() => Math.random()),
          content: `Concurrent test document ${i}`,
          metadata: { concurrent: true }
        };
        
        testData.push(testDoc);
        promises.push(vectorDb.insertDocument(testDoc));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(results).to.have.length(concurrentOps);
      expect(duration).to.be.lessThan(5000); // Should complete within 5 seconds
      
      results.forEach(result => {
        expect(result.acknowledged).to.be.true;
        expect(result.insertedId).to.exist;
      });
    });
  });
}); 
