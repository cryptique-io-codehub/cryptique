const { expect } = require('chai');
const sinon = require('sinon');
const EventEmitter = require('events');

// Mock Google Generative AI
const mockGoogleGenerativeAI = {
  getGenerativeModel: sinon.stub()
};

// Mock the Google AI module before requiring the service
const mockGoogleAI = {
  GoogleGenerativeAI: sinon.stub().returns(mockGoogleGenerativeAI)
};

// Mock node-cache
const mockCache = {
  get: sinon.stub(),
  set: sinon.stub(),
  keys: sinon.stub().returns([]),
  flushAll: sinon.stub()
};

const mockNodeCache = sinon.stub().returns(mockCache);

// Mock modules
const moduleStubs = {
  '@google/generative-ai': mockGoogleAI,
  'node-cache': mockNodeCache,
  'express-rate-limit': sinon.stub()
};

// Apply mocks
Object.keys(moduleStubs).forEach(moduleName => {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id) {
    if (moduleStubs[id]) {
      return moduleStubs[id];
    }
    return originalRequire.apply(this, arguments);
  };
});

// Now require the service after mocking
const geminiEmbeddingService = require('../services/geminiEmbeddingService');

describe('Gemini Embedding Service Tests', function() {
  this.timeout(10000);
  
  beforeEach(function() {
    // Reset all stubs
    sinon.reset();
    
    // Set up default environment
    process.env.GEMINI_API_KEY = 'test-api-key';
    
    // Reset service state
    geminiEmbeddingService.clearCache();
    geminiEmbeddingService.resetStats();
  });
  
  afterEach(function() {
    sinon.restore();
  });

  describe('Service Initialization Tests', function() {
    it('should initialize with correct configuration', function() {
      expect(geminiEmbeddingService).to.be.instanceOf(EventEmitter);
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.totalRequests).to.equal(0);
      expect(stats.cache.keys).to.equal(0);
    });
    
    it('should have proper rate limiting configuration', function() {
      const stats = geminiEmbeddingService.getStats();
      expect(stats.rateLimiter.currentMinuteRequests).to.equal(0);
      expect(stats.rateLimiter.currentDayRequests).to.equal(0);
    });
    
    it('should emit events during operation', function(done) {
      let eventCount = 0;
      
      geminiEmbeddingService.on('stats', (stats) => {
        expect(stats).to.be.an('object');
        eventCount++;
      });
      
      geminiEmbeddingService.on('cacheCleared', () => {
        eventCount++;
        if (eventCount >= 2) done();
      });
      
      // Trigger events
      geminiEmbeddingService.clearCache();
      geminiEmbeddingService.emit('stats', {});
    });
  });

  describe('Input Validation Tests', function() {
    it('should validate text input', async function() {
      const testCases = [
        { input: null, expectedError: 'Text must be a non-empty string' },
        { input: '', expectedError: 'Text cannot be empty or only whitespace' },
        { input: '   ', expectedError: 'Text cannot be empty or only whitespace' },
        { input: 123, expectedError: 'Text must be a non-empty string' },
        { input: 'a'.repeat(8001), expectedError: 'Text length exceeds maximum limit' }
      ];
      
      for (const testCase of testCases) {
        try {
          await geminiEmbeddingService.generateEmbedding(testCase.input);
          expect.fail(`Should have thrown error for input: ${testCase.input}`);
        } catch (error) {
          expect(error.message).to.include(testCase.expectedError);
        }
      }
    });
    
    it('should validate options', async function() {
      try {
        await geminiEmbeddingService.generateEmbedding('test', { 
          model: 'invalid-model' 
        });
        expect.fail('Should have thrown error for invalid model');
      } catch (error) {
        expect(error.message).to.include('Invalid embedding model');
      }
    });
    
    it('should accept valid input', function() {
      const validInputs = [
        'Hello world',
        'This is a test sentence with multiple words.',
        'A'.repeat(1000), // Long but valid text
        'Special characters: !@#$%^&*()'
      ];
      
      // These should not throw validation errors
      validInputs.forEach(input => {
        expect(() => {
          // We're only testing validation, not actual API calls
          geminiEmbeddingService.validateInput(input, {});
        }).to.not.throw();
      });
    });
  });

  describe('Caching Tests', function() {
    it('should generate cache keys correctly', function() {
      const text1 = 'Test text 1';
      const text2 = 'Test text 2';
      const options1 = { model: 'embedding-001' };
      const options2 = { model: 'embedding-001' };
      
      const key1a = geminiEmbeddingService.generateCacheKey(text1, options1);
      const key1b = geminiEmbeddingService.generateCacheKey(text1, options1);
      const key2 = geminiEmbeddingService.generateCacheKey(text2, options2);
      
      expect(key1a).to.equal(key1b); // Same input should generate same key
      expect(key1a).to.not.equal(key2); // Different input should generate different key
      expect(key1a).to.be.a('string');
      expect(key1a).to.have.lengthOf(64); // SHA256 hash length
    });
    
    it('should use cache when available', async function() {
      const testText = 'Cached test text';
      const cachedResult = {
        embedding: new Array(768).fill(0.5),
        tokensUsed: 100,
        cost: 0.01,
        responseTime: 50
      };
      
      // Mock cache hit
      mockCache.get.returns(cachedResult);
      
      const result = await geminiEmbeddingService.generateEmbedding(testText);
      
      expect(result).to.deep.equal(cachedResult);
      expect(mockCache.get.calledOnce).to.be.true;
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.cacheHits).to.equal(1);
      expect(stats.cacheMisses).to.equal(0);
    });
    
    it('should handle cache misses', async function() {
      const testText = 'Non-cached test text';
      
      // Mock cache miss
      mockCache.get.returns(undefined);
      
      // Mock successful API response
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: new Array(768).fill(0.3) }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      
      const result = await geminiEmbeddingService.generateEmbedding(testText);
      
      expect(result.embedding).to.have.lengthOf(768);
      expect(mockCache.set.calledOnce).to.be.true;
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.cacheMisses).to.equal(1);
    });
  });

  describe('Rate Limiting Tests', function() {
    it('should track rate limit counters', async function() {
      // Mock successful API response
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: new Array(768).fill(0.3) }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined); // Force API call
      
      await geminiEmbeddingService.generateEmbedding('Test rate limiting');
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.rateLimiter.currentMinuteRequests).to.equal(1);
      expect(stats.rateLimiter.currentDayRequests).to.equal(1);
    });
    
    it('should handle rate limit exceeded', function(done) {
      // Simulate rate limit exceeded
      const service = geminiEmbeddingService;
      service.rateLimiter.currentMinuteRequests = service.rateLimiter.requestsPerMinute;
      
      service.on('rateLimitHit', (data) => {
        expect(data.type).to.equal('minute');
        expect(data.waitTime).to.be.a('number');
        done();
      });
      
      // This should trigger rate limit
      service.checkRateLimit().catch(() => {
        // Expected to fail due to rate limit
      });
    });
  });

  describe('Connection Pool Tests', function() {
    it('should manage connection pool correctly', async function() {
      const maxConcurrent = 3;
      const requests = [];
      
      // Override connection pool size for testing
      geminiEmbeddingService.connectionPool.maxConcurrent = maxConcurrent;
      
      // Create more requests than max concurrent
      for (let i = 0; i < maxConcurrent + 2; i++) {
        requests.push(geminiEmbeddingService.waitForConnection());
      }
      
      // First 3 should resolve immediately
      const immediate = await Promise.race([
        Promise.all(requests.slice(0, maxConcurrent)),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 100))
      ]);
      
      expect(immediate).to.not.equal('timeout');
      
      // Release connections to allow queued requests
      for (let i = 0; i < maxConcurrent; i++) {
        geminiEmbeddingService.releaseConnection();
      }
      
      // Now remaining requests should resolve
      await Promise.all(requests.slice(maxConcurrent));
    });
  });

  describe('API Integration Tests', function() {
    it('should handle successful API responses', async function() {
      const testText = 'API integration test';
      const mockEmbedding = new Array(768).fill(0.7);
      
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: mockEmbedding }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined); // Force API call
      
      const result = await geminiEmbeddingService.generateEmbedding(testText);
      
      expect(result.embedding).to.deep.equal(mockEmbedding);
      expect(result.dimensions).to.equal(768);
      expect(result.tokensUsed).to.be.a('number');
      expect(result.cost).to.be.a('number');
      expect(result.responseTime).to.be.a('number');
      expect(result.confidence).to.equal(1.0);
    });
    
    it('should handle API errors', async function() {
      const testText = 'API error test';
      
      const mockModel = {
        embedContent: sinon.stub().rejects(new Error('API Error'))
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined); // Force API call
      
      try {
        await geminiEmbeddingService.generateEmbedding(testText);
        expect.fail('Should have thrown API error');
      } catch (error) {
        expect(error.message).to.include('API Error');
      }
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.failedRequests).to.equal(1);
      expect(stats.errors.apiErrors).to.equal(1);
    });
    
    it('should retry on retryable errors', async function() {
      const testText = 'Retry test';
      
      // First call fails, second succeeds
      const mockModel = {
        embedContent: sinon.stub()
          .onFirstCall().rejects({ status: 429, message: 'Rate limit' })
          .onSecondCall().resolves({
            embedding: { values: new Array(768).fill(0.5) }
          })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const result = await geminiEmbeddingService.generateEmbedding(testText);
      
      expect(result.embedding).to.have.lengthOf(768);
      expect(mockModel.embedContent.calledTwice).to.be.true;
    });
    
    it('should handle invalid API responses', async function() {
      const testText = 'Invalid response test';
      
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: null } // Invalid response
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      try {
        await geminiEmbeddingService.generateEmbedding(testText);
        expect.fail('Should have thrown error for invalid response');
      } catch (error) {
        expect(error.message).to.include('Invalid embedding response');
      }
    });
  });

  describe('Batch Processing Tests', function() {
    it('should process batch embeddings', async function() {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: new Array(768).fill(0.4) }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const result = await geminiEmbeddingService.generateBatchEmbeddings(texts, {
        batchSize: 2
      });
      
      expect(result.results).to.have.lengthOf(3);
      expect(result.errors).to.have.lengthOf(0);
      expect(mockModel.embedContent.callCount).to.equal(3);
    });
    
    it('should handle batch errors gracefully', async function() {
      const texts = ['Good text', 'Bad text', 'Another good text'];
      
      const mockModel = {
        embedContent: sinon.stub()
          .onFirstCall().resolves({
            embedding: { values: new Array(768).fill(0.4) }
          })
          .onSecondCall().rejects(new Error('API Error'))
          .onThirdCall().resolves({
            embedding: { values: new Array(768).fill(0.4) }
          })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const result = await geminiEmbeddingService.generateBatchEmbeddings(texts);
      
      expect(result.results.filter(r => r)).to.have.lengthOf(2);
      expect(result.errors).to.have.lengthOf(1);
      expect(result.errors[0].index).to.equal(1);
    });
  });

  describe('Statistics and Monitoring Tests', function() {
    it('should track statistics correctly', async function() {
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: new Array(768).fill(0.6) }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      await geminiEmbeddingService.generateEmbedding('Stats test');
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.totalRequests).to.equal(1);
      expect(stats.successfulRequests).to.equal(1);
      expect(stats.failedRequests).to.equal(0);
      expect(stats.totalTokensUsed).to.be.greaterThan(0);
      expect(stats.totalCost).to.be.greaterThan(0);
    });
    
    it('should reset statistics', function() {
      // Generate some stats first
      geminiEmbeddingService.stats.totalRequests = 10;
      geminiEmbeddingService.stats.successfulRequests = 8;
      geminiEmbeddingService.stats.failedRequests = 2;
      
      geminiEmbeddingService.resetStats();
      
      const stats = geminiEmbeddingService.getStats();
      expect(stats.totalRequests).to.equal(0);
      expect(stats.successfulRequests).to.equal(0);
      expect(stats.failedRequests).to.equal(0);
      expect(stats.lastResetTime).to.be.a('number');
    });
    
    it('should categorize errors correctly', function() {
      const errorTypes = [
        { error: new Error('rate limit exceeded'), expected: 'rate_limit' },
        { error: new Error('validation failed'), expected: 'validation' },
        { error: { code: 'ECONNRESET' }, expected: 'network' },
        { error: new Error('generic error'), expected: 'api' }
      ];
      
      errorTypes.forEach(({ error, expected }) => {
        const category = geminiEmbeddingService.categorizeError(error);
        expect(category).to.equal(expected);
      });
    });
  });

  describe('Health Check Tests', function() {
    it('should return healthy status on successful health check', async function() {
      const mockModel = {
        embedContent: sinon.stub().resolves({
          embedding: { values: new Array(768).fill(0.8) }
        })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const health = await geminiEmbeddingService.healthCheck();
      
      expect(health.status).to.equal('healthy');
      expect(health.timestamp).to.be.a('number');
      expect(health.stats).to.be.an('object');
      expect(health.testEmbedding.dimensions).to.equal(768);
    });
    
    it('should return unhealthy status on failed health check', async function() {
      const mockModel = {
        embedContent: sinon.stub().rejects(new Error('Health check failed'))
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const health = await geminiEmbeddingService.healthCheck();
      
      expect(health.status).to.equal('unhealthy');
      expect(health.error).to.include('Health check failed');
    });
  });

  describe('Error Recovery Tests', function() {
    it('should handle retryable errors with exponential backoff', async function() {
      const testText = 'Backoff test';
      
      // Mock multiple failures then success
      const mockModel = {
        embedContent: sinon.stub()
          .onCall(0).rejects({ status: 429 })
          .onCall(1).rejects({ status: 503 })
          .onCall(2).resolves({
            embedding: { values: new Array(768).fill(0.9) }
          })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      const startTime = Date.now();
      const result = await geminiEmbeddingService.generateEmbedding(testText);
      const endTime = Date.now();
      
      expect(result.embedding).to.have.lengthOf(768);
      expect(mockModel.embedContent.callCount).to.equal(3);
      expect(endTime - startTime).to.be.greaterThan(1000); // Should have delays
    });
    
    it('should give up after max retries', async function() {
      const testText = 'Max retries test';
      
      const mockModel = {
        embedContent: sinon.stub().rejects({ status: 429 })
      };
      mockGoogleGenerativeAI.getGenerativeModel.returns(mockModel);
      mockCache.get.returns(undefined);
      
      try {
        await geminiEmbeddingService.generateEmbedding(testText);
        expect.fail('Should have failed after max retries');
      } catch (error) {
        expect(mockModel.embedContent.callCount).to.equal(4); // Initial + 3 retries
      }
    });
  });
}); 