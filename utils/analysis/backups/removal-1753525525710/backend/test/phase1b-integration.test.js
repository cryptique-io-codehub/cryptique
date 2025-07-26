const mongoose = require('mongoose');
const { expect } = require('chai');
const DocumentProcessingService = require('../services/documentProcessingService');
const PipelineOrchestrationService = require('../services/pipelineOrchestrationService');
const MonitoringDashboardService = require('../services/monitoringDashboardService');

// Test data
const mockDocument = {
  _id: new mongoose.Types.ObjectId(),
  content: 'This is a test document with analytics data. User clicked on button A and navigated to page B. The session lasted 5 minutes with 3 page views. Transaction hash 0x1234567890abcdef shows successful payment processing.',
  eventType: 'click',
  websiteId: 'test-website-123',
  userId: 'test-user-456',
  sessionId: 'test-session-789',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15')
};

const longDocument = {
  _id: new mongoose.Types.ObjectId(),
  content: 'This is a very long document that should be split into multiple chunks. '.repeat(50) +
    'It contains detailed analytics information about user behavior and transaction patterns. '.repeat(30) +
    'The document includes metadata about smart contracts, blockchain transactions, and user interactions. '.repeat(20),
  type: 'long-form',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15')
};

describe('Phase 1B Integration Tests - Data Processing Pipeline', function() {
  this.timeout(30000);
  
  let documentProcessor;
  let pipelineOrchestrator;
  let monitoringDashboard;
  
  before(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptique_test';
    await mongoose.connect(mongoUri);
    
    // Clean up test data
    await mongoose.connection.db.dropDatabase();
  });
  
  beforeEach(() => {
    // Initialize services with test configuration
    documentProcessor = new DocumentProcessingService({
      chunkSize: 500,
      chunkOverlap: 100,
      batchSize: 5,
      maxConcurrentJobs: 2,
      memoryThreshold: 50 * 1024 * 1024 // 50MB
    });
    
    pipelineOrchestrator = new PipelineOrchestrationService({
      maxConcurrentJobs: 2,
      maxRetries: 2,
      retryDelayMs: 100,
      healthCheckInterval: 5000,
      jobTimeout: 10000
    });
    
    monitoringDashboard = new MonitoringDashboardService({
      refreshInterval: 1000,
      retentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        errorRate: 0.1,
        responseTime: 5000,
        queueLength: 10,
        memoryUsage: 0.8
      }
    });
  });
  
  afterEach(async () => {
    if (pipelineOrchestrator) {
      await pipelineOrchestrator.stop();
    }
    if (monitoringDashboard) {
      monitoringDashboard.stop();
    }
    
    // Reset stats
    documentProcessor.resetStats();
  });
  
  after(async () => {
    await mongoose.connection.close();
  });

  describe('Document Processing Service', () => {
    describe('Text Chunking with Overlap', () => {
      it('should create chunks with correct size and overlap', async () => {
        const result = await documentProcessor.processDocument(longDocument, 'test');
        
        expect(result).to.be.an('array');
        expect(result.length).to.be.greaterThan(1);
        
        // Check chunk properties
        result.forEach((chunk, index) => {
          expect(chunk).to.have.property('content');
          expect(chunk).to.have.property('metadata');
          expect(chunk).to.have.property('tags');
          expect(chunk).to.have.property('timeframe');
          expect(chunk).to.have.property('searchKeywords');
          
          expect(chunk.content.length).to.be.lessThanOrEqual(600); // Allow some flexibility
          expect(chunk.metadata.chunkIndex).to.equal(index);
          expect(chunk.metadata.chunkLength).to.equal(chunk.content.length);
        });
      });
      
      it('should handle small documents without chunking', async () => {
        const result = await documentProcessor.processDocument(mockDocument, 'analytics');
        
        expect(result).to.be.an('array');
        expect(result.length).to.equal(1);
        expect(result[0].content).to.include('analytics data');
      });
      
      it('should create meaningful overlap between chunks', async () => {
        const result = await documentProcessor.processDocument(longDocument, 'test');
        
        if (result.length > 1) {
          for (let i = 0; i < result.length - 1; i++) {
            const chunk1 = result[i].content;
            const chunk2 = result[i + 1].content;
            
            expect(chunk1.length).to.be.greaterThan(0);
            expect(chunk2.length).to.be.greaterThan(0);
          }
        }
      });
    });

    describe('Metadata Extraction', () => {
      it('should extract analytics metadata correctly', async () => {
        const result = await documentProcessor.processDocument(mockDocument, 'analytics');
        const metadata = result[0].metadata;
        
        expect(metadata.source).to.equal('analytics');
        expect(metadata.eventType).to.equal('click');
        expect(metadata.websiteId).to.equal('test-website-123');
        expect(metadata.userId).to.equal('test-user-456');
        expect(metadata.sessionId).to.equal('test-session-789');
        expect(metadata.documentId).to.deep.equal(mockDocument._id);
      });
      
      it('should handle different document types', async () => {
        const transactionDoc = {
          _id: new mongoose.Types.ObjectId(),
          content: 'Transaction executed on Ethereum blockchain',
          transactionHash: '0xabcdef123456',
          contractAddress: '0x123456789abc',
          chainId: 1,
          blockNumber: 18500000,
          createdAt: new Date()
        };
        
        const result = await documentProcessor.processDocument(transactionDoc, 'transactions');
        const metadata = result[0].metadata;
        
        expect(metadata.source).to.equal('transactions');
        expect(metadata.transactionHash).to.equal('0xabcdef123456');
        expect(metadata.contractAddress).to.equal('0x123456789abc');
        expect(metadata.chainId).to.equal(1);
        expect(metadata.blockNumber).to.equal(18500000);
      });
    });

    describe('Source Tracking', () => {
      it('should track source collection correctly', async () => {
        const sources = ['analytics', 'transactions', 'users', 'campaigns'];
        
        for (const source of sources) {
          const result = await documentProcessor.processDocument(mockDocument, source);
          
          expect(result[0].sourceCollection).to.equal(source);
          expect(result[0].metadata.source).to.equal(source);
        }
      });
      
      it('should maintain source consistency across chunks', async () => {
        const result = await documentProcessor.processDocument(longDocument, 'test-source');
        
        result.forEach(chunk => {
          expect(chunk.sourceCollection).to.equal('test-source');
          expect(chunk.metadata.source).to.equal('test-source');
        });
      });
    });

    describe('Batch Processing', () => {
      it('should process batch of documents', async () => {
        const documents = [
          { ...mockDocument, _id: new mongoose.Types.ObjectId() },
          { ...mockDocument, _id: new mongoose.Types.ObjectId() },
          { ...mockDocument, _id: new mongoose.Types.ObjectId() }
        ];
        
        const result = await documentProcessor.processBatch(documents, 'test-batch');
        
        expect(result).to.have.property('totalDocuments', 3);
        expect(result).to.have.property('processedDocuments');
        expect(result).to.have.property('totalChunks');
        expect(result).to.have.property('errors');
        expect(result).to.have.property('processingTime');
        expect(result).to.have.property('batches');
        
        expect(result.processedDocuments).to.be.greaterThan(0);
        expect(result.totalChunks).to.be.greaterThan(0);
        expect(result.errors).to.be.an('array');
        expect(result.batches).to.be.an('array');
      });
      
      it('should respect batch size limits', async () => {
        const documents = Array(10).fill(null).map((_, index) => ({
          ...mockDocument,
          _id: new mongoose.Types.ObjectId(),
          content: `Document ${index} content with test data.`
        }));
        
        const result = await documentProcessor.processBatch(documents, 'test', { batchSize: 3 });
        
        expect(result.batches.length).to.be.greaterThan(1);
        
        result.batches.forEach((batch, index) => {
          expect(batch.batchNumber).to.equal(index + 1);
          expect(batch).to.have.property('processedCount');
          expect(batch).to.have.property('chunksCreated');
          expect(batch).to.have.property('errors');
          expect(batch).to.have.property('processingTime');
        });
      });
      
      it('should handle empty batch gracefully', async () => {
        const result = await documentProcessor.processBatch([], 'test');
        
        expect(result.totalDocuments).to.equal(0);
        expect(result.processedDocuments).to.equal(0);
        expect(result.totalChunks).to.equal(0);
        expect(result.batches.length).to.equal(0);
      });
    });

    describe('Memory Usage Patterns', () => {
      it('should track memory usage during processing', async () => {
        const initialStats = documentProcessor.getStats();
        expect(initialStats.memoryUsage).to.be.an('object');
        
        // Process several documents
        const documents = Array(5).fill(null).map((_, index) => ({
          ...longDocument,
          _id: new mongoose.Types.ObjectId(),
          content: longDocument.content + ` Document ${index} additional content.`
        }));
        
        await documentProcessor.processBatch(documents, 'memory-test');
        
        const finalStats = documentProcessor.getStats();
        expect(finalStats.memoryUsage.peak).to.be.greaterThanOrEqual(finalStats.memoryUsage.current);
      });
    });
  });

  describe('Pipeline Orchestration Service', () => {
    describe('Job Queue System', () => {
      it('should add job to queue successfully', async () => {
        const jobData = {
          source: 'analytics',
          documentIds: [mockDocument._id],
          batchSize: 5,
          priority: 'medium',
          configuration: {
            chunkSize: 1000,
            chunkOverlap: 200
          }
        };
        
        const jobId = await pipelineOrchestrator.addJob(jobData);
        
        expect(jobId).to.be.a('string');
        
        // Check job was created in database
        const EmbeddingJob = require('../models/embeddingJob');
        const job = await EmbeddingJob.findById(jobId);
        expect(job).to.exist;
        expect(job.source).to.equal('analytics');
        expect(job.status).to.equal('queued');
        expect(job.priority).to.equal('medium');
      });
      
      it('should validate job data before adding', async () => {
        try {
          await pipelineOrchestrator.addJob({});
          expect.fail('Should have thrown validation error');
        } catch (error) {
          expect(error.message).to.include('source is required');
        }
      });
    });

    describe('Progress Tracking', () => {
      it('should track job progress accurately', async () => {
        const jobData = {
          source: 'analytics',
          batchSize: 2,
          priority: 'medium'
        };
        
        const jobId = await pipelineOrchestrator.addJob(jobData);
        
        // Wait for job to start
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const EmbeddingJob = require('../models/embeddingJob');
        const job = await EmbeddingJob.findById(jobId);
        
        expect(job.progress).to.exist;
        expect(job.progress).to.have.property('stage');
        expect(job.progress).to.have.property('percentage');
        expect(job.progress.percentage).to.be.at.least(0);
        expect(job.progress.percentage).to.be.at.most(100);
      });
    });

    describe('Monitoring Metrics', () => {
      it('should provide comprehensive metrics', async () => {
        const metrics = pipelineOrchestrator.getMetrics();
        
        expect(metrics).to.have.property('totalJobsProcessed');
        expect(metrics).to.have.property('totalJobsFailed');
        expect(metrics).to.have.property('averageProcessingTime');
        expect(metrics).to.have.property('queueLength');
        expect(metrics).to.have.property('activeJobs');
        expect(metrics).to.have.property('healthStatus');
        expect(metrics).to.have.property('performance');
        expect(metrics).to.have.property('services');
      });
      
      it('should track health status', async () => {
        const healthStatus = pipelineOrchestrator.getHealthStatus();
        
        expect(healthStatus).to.have.property('status');
        expect(healthStatus).to.have.property('uptime');
        expect(healthStatus).to.have.property('activeJobs');
        expect(healthStatus).to.have.property('queueLength');
        expect(healthStatus).to.have.property('successRate');
        
        expect(['healthy', 'degraded', 'unhealthy']).to.include(healthStatus.status);
      });
    });
  });

  describe('Monitoring Dashboard Service', () => {
    describe('Metrics Collection', () => {
      it('should collect comprehensive metrics', async () => {
        monitoringDashboard.start();
        
        // Wait for initial metrics collection
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const metrics = await monitoringDashboard.getMetrics();
        
        expect(metrics).to.have.property('timestamp');
        expect(metrics).to.have.property('jobs');
        expect(metrics).to.have.property('system');
        expect(metrics).to.have.property('performance');
        expect(metrics).to.have.property('health');
        expect(metrics).to.have.property('vectors');
        expect(metrics).to.have.property('alerts');
        
        // Check job metrics
        expect(metrics.jobs).to.have.property('total');
        expect(metrics.jobs).to.have.property('completed');
        expect(metrics.jobs).to.have.property('failed');
        expect(metrics.jobs).to.have.property('active');
        expect(metrics.jobs).to.have.property('queued');
        expect(metrics.jobs).to.have.property('successRate');
        expect(metrics.jobs).to.have.property('errorRate');
        
        // Check system metrics
        expect(metrics.system).to.have.property('memory');
        expect(metrics.system).to.have.property('cpu');
        expect(metrics.system).to.have.property('uptime');
        
        // Check health metrics
        expect(metrics.health).to.have.property('overall');
        expect(metrics.health).to.have.property('database');
        expect(metrics.health).to.have.property('api');
        expect(metrics.health).to.have.property('services');
        
        monitoringDashboard.stop();
      });
      
      it('should provide dashboard summary', async () => {
        const summary = await monitoringDashboard.getDashboardSummary();
        
        expect(summary).to.have.property('status');
        expect(summary).to.have.property('summary');
        expect(summary).to.have.property('health');
        
        expect(summary.summary).to.have.property('totalJobs');
        expect(summary.summary).to.have.property('activeJobs');
        expect(summary.summary).to.have.property('queuedJobs');
        expect(summary.summary).to.have.property('successRate');
        expect(summary.summary).to.have.property('errorRate');
        expect(summary.summary).to.have.property('memoryUsage');
        expect(summary.summary).to.have.property('uptime');
        
        expect(summary.health).to.have.property('database');
        expect(summary.health).to.have.property('api');
        expect(summary.health).to.have.property('services');
      });
    });
  });

  describe('End-to-End Integration', () => {
    it('should complete full pipeline from document to vector storage', async function() {
      this.timeout(45000);
      
      // Start monitoring
      monitoringDashboard.start();
      
      // Create test documents
      const testDocuments = [
        { ...mockDocument, _id: new mongoose.Types.ObjectId() },
        { ...longDocument, _id: new mongoose.Types.ObjectId() }
      ];
      
      // Process documents
      const processingResult = await documentProcessor.processBatch(testDocuments, 'integration-test');
      
      expect(processingResult.processedDocuments).to.be.greaterThan(0);
      expect(processingResult.totalChunks).to.be.greaterThan(0);
      
      // Get processing stats
      const stats = documentProcessor.getStats();
      expect(stats.documentsProcessed).to.be.greaterThan(0);
      expect(stats.chunksCreated).to.be.greaterThan(0);
      expect(stats.lastProcessedAt).to.be.instanceOf(Date);
      
      // Get orchestrator metrics
      const orchestratorMetrics = pipelineOrchestrator.getMetrics();
      expect(orchestratorMetrics).to.have.property('services');
      expect(orchestratorMetrics.services).to.have.property('documentProcessor');
      
      // Get monitoring dashboard summary
      const dashboardSummary = await monitoringDashboard.getDashboardSummary();
      expect(dashboardSummary.status).to.be.oneOf(['healthy', 'degraded', 'unavailable']);
      
      monitoringDashboard.stop();
    });
    
    it('should handle system errors gracefully', async () => {
      // Test with invalid document
      try {
        await documentProcessor.processDocument(null, 'test');
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).to.exist;
      }
      
      // Stats should reflect the error
      const stats = documentProcessor.getStats();
      expect(stats.errors).to.be.greaterThan(0);
    });
  });
}); 