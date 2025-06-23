const mongoose = require('mongoose');
const { expect } = require('chai');
const sinon = require('sinon');

// Import models
const VectorDocument = require('../models/vectorDocument');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');
const geminiEmbeddingService = require('../services/geminiEmbeddingService');

// Test database configuration
const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/cryptique-test-vector';

describe('Vector Database Infrastructure Tests', function() {
  this.timeout(30000); // 30 second timeout for database operations
  
  before(async function() {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
  });
  
  after(async function() {
    // Clean up and close connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });
  
  beforeEach(async function() {
    // Clear collections before each test
    await VectorDocument.deleteMany({});
    await EmbeddingJob.deleteMany({});
    await EmbeddingStats.deleteMany({});
  });

  describe('Database Connection Tests', function() {
    it('should connect to MongoDB successfully', function() {
      expect(mongoose.connection.readyState).to.equal(1); // Connected
    });
    
    it('should have proper connection pool configuration', function() {
      const options = mongoose.connection.options;
      expect(options.maxPoolSize).to.be.greaterThan(0);
      expect(options.minPoolSize).to.be.greaterThan(0);
    });
    
    it('should handle connection errors gracefully', async function() {
      const invalidUri = 'mongodb://invalid-host:27017/test';
      
      try {
        await mongoose.createConnection(invalidUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 1000
        });
        expect.fail('Should have thrown connection error');
      } catch (error) {
        expect(error.name).to.include('MongoServerSelectionError');
      }
    });
  });

  describe('VectorDocument Model Tests', function() {
    const sampleVectorDoc = {
      documentId: 'test-doc-001',
      sourceType: 'analytics',
      sourceId: new mongoose.Types.ObjectId(),
      siteId: 'test-site-001',
      teamId: new mongoose.Types.ObjectId(),
      embedding: new Array(768).fill(0.1), // Valid 1536-dimensional vector
      content: 'This is test content for embedding',
      summary: 'Test summary',
      metadata: {
        timeframe: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02')
        },
        dataType: 'metric',
        tags: ['test', 'analytics'],
        category: 'performance',
        importance: 7,
        metricType: 'conversion_rate',
        aggregationLevel: 'daily'
      }
    };
    
    it('should create a valid vector document', async function() {
      const doc = new VectorDocument(sampleVectorDoc);
      const savedDoc = await doc.save();
      
      expect(savedDoc._id).to.exist;
      expect(savedDoc.documentId).to.equal(sampleVectorDoc.documentId);
      expect(savedDoc.embedding).to.have.lengthOf(1536);
      expect(savedDoc.status).to.equal('active');
      expect(savedDoc.version).to.equal(1);
    });
    
    it('should validate embedding dimensions', async function() {
      const invalidDoc = { ...sampleVectorDoc };
      invalidDoc.embedding = new Array(512).fill(0.1); // Wrong dimensions
      
      const doc = new VectorDocument(invalidDoc);
      
      try {
        await doc.save();
        expect.fail('Should have failed validation');
      } catch (error) {
        expect(error.errors.embedding).to.exist;
        expect(error.errors.embedding.message).to.include('1536 dimensions');
      }
    });
    
    it('should enforce required fields', async function() {
      const incompleteDoc = {
        documentId: 'test-doc-002'
        // Missing required fields
      };
      
      const doc = new VectorDocument(incompleteDoc);
      
      try {
        await doc.save();
        expect.fail('Should have failed validation');
      } catch (error) {
        expect(error.errors.sourceType).to.exist;
        expect(error.errors.sourceId).to.exist;
        expect(error.errors.siteId).to.exist;
        expect(error.errors.teamId).to.exist;
        expect(error.errors.embedding).to.exist;
        expect(error.errors.content).to.exist;
      }
    });
    
    it('should validate sourceType enum values', async function() {
      const invalidDoc = { ...sampleVectorDoc };
      invalidDoc.sourceType = 'invalid_type';
      
      const doc = new VectorDocument(invalidDoc);
      
      try {
        await doc.save();
        expect.fail('Should have failed validation');
      } catch (error) {
        expect(error.errors.sourceType).to.exist;
      }
    });
    
    it('should create proper indexes', async function() {
      const indexes = await VectorDocument.collection.getIndexes();
      
      // Check for key indexes
      expect(indexes).to.have.property('documentId_1');
      expect(indexes).to.have.property('sourceType_1');
      expect(indexes).to.have.property('siteId_1');
      expect(indexes).to.have.property('teamId_1');
      expect(indexes).to.have.property('status_1_createdAt_-1');
      
      // Check compound indexes
      expect(indexes).to.have.property('teamId_1_siteId_1_sourceType_1');
    });
    
    it('should use static methods correctly', async function() {
      // Create test documents
      const doc1 = await new VectorDocument(sampleVectorDoc).save();
      const doc2 = await new VectorDocument({
        ...sampleVectorDoc,
        documentId: 'test-doc-002',
        sourceType: 'transaction'
      }).save();
      
      // Test findByTeamAndSite
      const teamSiteDocs = await VectorDocument.findByTeamAndSite(
        sampleVectorDoc.teamId,
        sampleVectorDoc.siteId
      );
      expect(teamSiteDocs).to.have.lengthOf(2);
      
      // Test findBySourceType
      const analyticsDocs = await VectorDocument.findBySourceType(
        'analytics',
        sampleVectorDoc.teamId
      );
      expect(analyticsDocs).to.have.lengthOf(1);
      expect(analyticsDocs[0].sourceType).to.equal('analytics');
    });
    
    it('should handle archiving and deprecation', async function() {
      const doc = await new VectorDocument(sampleVectorDoc).save();
      
      // Test archiving
      await doc.archive();
      expect(doc.status).to.equal('archived');
      
      // Test deprecation
      await doc.deprecate();
      expect(doc.status).to.equal('deprecated');
    });
  });

  describe('EmbeddingJob Model Tests', function() {
    const sampleJob = {
      jobId: 'job-001',
      jobType: 'initial_processing',
      priority: 5,
      sourceType: 'analytics',
      sourceIds: [new mongoose.Types.ObjectId()],
      teamId: new mongoose.Types.ObjectId(),
      siteId: 'test-site-001',
      progress: {
        total: 100,
        processed: 0,
        failed: 0
      }
    };
    
    it('should create a valid embedding job', async function() {
      const job = new EmbeddingJob(sampleJob);
      const savedJob = await job.save();
      
      expect(savedJob._id).to.exist;
      expect(savedJob.jobId).to.equal(sampleJob.jobId);
      expect(savedJob.status).to.equal('pending');
      expect(savedJob.progress.percentage).to.equal(0);
    });
    
    it('should calculate progress percentage automatically', async function() {
      const job = new EmbeddingJob(sampleJob);
      job.progress.processed = 50;
      await job.save();
      
      expect(job.progress.percentage).to.equal(50);
    });
    
    it('should handle job lifecycle methods', async function() {
      const job = await new EmbeddingJob(sampleJob).save();
      
      // Test start
      await job.start();
      expect(job.status).to.equal('processing');
      expect(job.startedAt).to.exist;
      
      // Test complete
      await job.complete();
      expect(job.status).to.equal('completed');
      expect(job.completedAt).to.exist;
      expect(job.progress.percentage).to.equal(100);
    });
    
    it('should handle retry logic', async function() {
      const job = await new EmbeddingJob(sampleJob).save();
      
      // Test successful retry
      await job.retry();
      expect(job.status).to.equal('retrying');
      expect(job.retryConfig.retryCount).to.equal(1);
      expect(job.retryConfig.nextRetryAt).to.exist;
      
      // Test max retries exceeded
      job.retryConfig.retryCount = job.retryConfig.maxRetries;
      
      try {
        await job.retry();
        expect.fail('Should have thrown max retries error');
      } catch (error) {
        expect(error.message).to.include('Maximum retries exceeded');
      }
    });
    
    it('should get next job in queue', async function() {
      // Create jobs with different priorities
      await new EmbeddingJob({ ...sampleJob, jobId: 'job-low', priority: 3 }).save();
      await new EmbeddingJob({ ...sampleJob, jobId: 'job-high', priority: 8 }).save();
      await new EmbeddingJob({ ...sampleJob, jobId: 'job-medium', priority: 5 }).save();
      
      const nextJob = await EmbeddingJob.getNextJob();
      expect(nextJob.priority).to.equal(8); // Highest priority first
      expect(nextJob.status).to.equal('processing');
    });
    
    it('should get job statistics', async function() {
      const teamId = new mongoose.Types.ObjectId();
      
      // Create jobs with different statuses
      await new EmbeddingJob({ 
        ...sampleJob, 
        jobId: 'job-completed', 
        teamId,
        status: 'completed',
        results: { documentsCreated: 10, totalCost: 0.05 }
      }).save();
      
      await new EmbeddingJob({ 
        ...sampleJob, 
        jobId: 'job-failed', 
        teamId,
        status: 'failed' 
      }).save();
      
      const stats = await EmbeddingJob.getJobStats(teamId);
      expect(stats).to.be.an('array');
      expect(stats.find(s => s._id === 'completed')).to.exist;
      expect(stats.find(s => s._id === 'failed')).to.exist;
    });
  });

  describe('EmbeddingStats Model Tests', function() {
    const sampleStats = {
      period: 'daily',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-02'),
      teamId: new mongoose.Types.ObjectId(),
      processing: {
        jobsCreated: 10,
        jobsCompleted: 8,
        jobsFailed: 2,
        documentsProcessed: 100
      },
      apiUsage: {
        totalApiCalls: 100,
        successfulApiCalls: 95,
        totalTokensUsed: 5000,
        totalCost: 0.50
      }
    };
    
    it('should create valid embedding stats', async function() {
      const stats = new EmbeddingStats(sampleStats);
      const savedStats = await stats.save();
      
      expect(savedStats._id).to.exist;
      expect(savedStats.period).to.equal('daily');
      expect(savedStats.processing.errorRate).to.equal(20); // 2/10 * 100
      expect(savedStats.apiUsage.apiSuccessRate).to.equal(95); // 95/100 * 100
    });
    
    it('should calculate derived metrics automatically', async function() {
      const stats = new EmbeddingStats(sampleStats);
      await stats.save();
      
      expect(stats.processing.errorRate).to.equal(20);
      expect(stats.apiUsage.apiSuccessRate).to.equal(95);
      expect(stats.apiUsage.averageTokensPerRequest).to.be.approximately(52.63, 0.01);
      expect(stats.apiUsage.averageCostPerDocument).to.equal(0.005);
    });
    
    it('should enforce unique constraints', async function() {
      await new EmbeddingStats(sampleStats).save();
      
      // Try to create duplicate stats
      const duplicateStats = new EmbeddingStats(sampleStats);
      
      try {
        await duplicateStats.save();
        expect.fail('Should have failed unique constraint');
      } catch (error) {
        expect(error.code).to.equal(11000); // Duplicate key error
      }
    });
    
    it('should get usage trends', async function() {
      const teamId = new mongoose.Types.ObjectId();
      
      // Create daily stats for the past week
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        await new EmbeddingStats({
          ...sampleStats,
          teamId,
          startDate: date,
          endDate: date,
          processing: { documentsProcessed: 10 + i }
        }).save();
      }
      
      const trends = await EmbeddingStats.getUsageTrends(teamId, 7);
      expect(trends).to.have.lengthOf(7);
      expect(trends[0].documentsProcessed).to.exist;
    });
  });

  describe('Connection Pool and Performance Tests', function() {
    it('should handle concurrent connections', async function() {
      const concurrentOperations = 20;
      const promises = [];
      
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          new VectorDocument({
            documentId: `concurrent-doc-${i}`,
            sourceType: 'analytics',
            sourceId: new mongoose.Types.ObjectId(),
            siteId: 'concurrent-test',
            teamId: new mongoose.Types.ObjectId(),
            embedding: new Array(768).fill(Math.random()),
            content: `Concurrent test content ${i}`
          }).save()
        );
      }
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      
      expect(successful).to.have.lengthOf(concurrentOperations);
    });
    
    it('should maintain index performance', async function() {
      // Create a large number of documents
      const docs = [];
      for (let i = 0; i < 1000; i++) {
        docs.push({
          documentId: `perf-doc-${i}`,
          sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId(),
          siteId: `site-${i % 10}`,
          teamId: new mongoose.Types.ObjectId(),
          embedding: new Array(768).fill(Math.random()),
          content: `Performance test content ${i}`,
          metadata: {
            tags: [`tag-${i % 5}`, `category-${i % 3}`]
          }
        });
      }
      
      const startTime = Date.now();
      await VectorDocument.insertMany(docs);
      const insertTime = Date.now() - startTime;
      
      // Test query performance
      const queryStartTime = Date.now();
      const results = await VectorDocument.find({ 
        siteId: 'site-1',
        'metadata.tags': 'tag-1' 
      }).limit(10);
      const queryTime = Date.now() - queryStartTime;
      
      expect(insertTime).to.be.lessThan(5000); // Should insert 1000 docs in < 5 seconds
      expect(queryTime).to.be.lessThan(100); // Should query in < 100ms
      expect(results.length).to.be.greaterThan(0);
    });
    
    it('should validate schema constraints under load', async function() {
      const invalidDocs = [];
      
      // Create documents with various validation errors
      for (let i = 0; i < 100; i++) {
        invalidDocs.push(
          new VectorDocument({
            documentId: `invalid-doc-${i}`,
            sourceType: 'invalid_type', // Invalid enum value
            sourceId: new mongoose.Types.ObjectId(),
            siteId: `site-${i}`,
            teamId: new mongoose.Types.ObjectId(),
            embedding: new Array(512).fill(0.1), // Wrong dimensions
            content: `Invalid test content ${i}`
          }).save().catch(err => err)
        );
      }
      
      const results = await Promise.all(invalidDocs);
      const errors = results.filter(r => r instanceof Error);
      
      expect(errors).to.have.lengthOf(100);
      errors.forEach(error => {
        expect(error.errors).to.exist;
      });
    });
  });

  describe('Index Performance Tests', function() {
    beforeEach(async function() {
      // Create test data for index performance testing
      const testDocs = [];
      for (let i = 0; i < 500; i++) {
        testDocs.push({
          documentId: `index-test-${i}`,
          sourceType: ['analytics', 'transaction', 'session'][i % 3],
          sourceId: new mongoose.Types.ObjectId(),
          siteId: `site-${i % 20}`,
          teamId: new mongoose.Types.ObjectId(),
          embedding: new Array(768).fill(Math.random()),
          content: `Index test content ${i}`,
          metadata: {
            timeframe: {
              start: new Date(2024, 0, 1 + (i % 30)),
              end: new Date(2024, 0, 2 + (i % 30))
            },
            dataType: ['metric', 'event', 'journey'][i % 3],
            tags: [`tag-${i % 10}`],
            importance: (i % 10) + 1
          },
          status: ['active', 'archived'][i % 2]
        });
      }
      
      await VectorDocument.insertMany(testDocs);
    });
    
    it('should perform efficient queries on indexed fields', async function() {
      const queries = [
        // Test single field indexes
        { sourceType: 'analytics' },
        { status: 'active' },
        { siteId: 'site-1' },
        
        // Test compound indexes
        { teamId: new mongoose.Types.ObjectId(), siteId: 'site-1' },
        { sourceType: 'analytics', 'metadata.dataType': 'metric' },
        
        // Test range queries on indexed fields
        { 
          'metadata.timeframe.start': { 
            $gte: new Date(2024, 0, 1), 
            $lte: new Date(2024, 0, 15) 
          } 
        }
      ];
      
      for (const query of queries) {
        const startTime = Date.now();
        const results = await VectorDocument.find(query).limit(50);
        const queryTime = Date.now() - startTime;
        
        expect(queryTime).to.be.lessThan(50); // Should complete in < 50ms
        expect(results).to.be.an('array');
      }
    });
    
    it('should verify index usage with explain', async function() {
      const explainResult = await VectorDocument.find({ 
        sourceType: 'analytics', 
        status: 'active' 
      }).explain('executionStats');
      
      expect(explainResult.executionStats.executionSuccess).to.be.true;
      expect(explainResult.executionStats.totalDocsExamined).to.be.lessThan(
        explainResult.executionStats.totalDocsInCollection
      );
    });
    
    it('should handle text search efficiently', async function() {
      const startTime = Date.now();
      const results = await VectorDocument.find({ 
        $text: { $search: 'test content' } 
      }).limit(20);
      const queryTime = Date.now() - startTime;
      
      expect(queryTime).to.be.lessThan(100);
      expect(results).to.be.an('array');
    });
  });

  describe('Error Handling and Edge Cases', function() {
    it('should handle invalid ObjectIds gracefully', async function() {
      try {
        await VectorDocument.findById('invalid-object-id');
        expect.fail('Should have thrown error for invalid ObjectId');
      } catch (error) {
        expect(error.name).to.equal('CastError');
      }
    });
    
    it('should handle missing required environment variables', function() {
      const originalApiKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      
      try {
        // This should handle missing API key gracefully
        const service = require('../services/geminiEmbeddingService');
        expect(service).to.exist;
      } finally {
        process.env.GEMINI_API_KEY = originalApiKey;
      }
    });
    
    it('should handle database disconnection gracefully', async function() {
      // Simulate connection loss
      await mongoose.connection.close();
      
      try {
        await new VectorDocument({
          documentId: 'disconnected-test',
          sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId(),
          siteId: 'test-site',
          teamId: new mongoose.Types.ObjectId(),
          embedding: new Array(768).fill(0.1),
          content: 'Disconnected test'
        }).save();
        
        expect.fail('Should have failed due to disconnection');
      } catch (error) {
        expect(error.message).to.include('buffering timed out');
      } finally {
        // Reconnect for other tests
        await mongoose.connect(TEST_DB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
      }
    });
  });
}); 
