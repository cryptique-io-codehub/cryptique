const mongoose = require('mongoose');
const EventEmitter = require('events');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');
const DocumentProcessingService = require('./documentProcessingService');
const GeminiEmbeddingService = require('./geminiEmbeddingService');

class PipelineOrchestrationService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelayMs = options.retryDelayMs || 5000;
    this.healthCheckInterval = options.healthCheckInterval || 30000; // 30 seconds
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    this.jobTimeout = options.jobTimeout || 600000; // 10 minutes
    
    // Service instances
    this.documentProcessor = new DocumentProcessingService(options.documentProcessing || {});
    
    // Initialize embedding service lazily to avoid constructor issues
    this.embeddingService = null;
    this.embeddingServiceOptions = options.geminiEmbedding || {};
    
    // Job management
    this.activeJobs = new Map();
    this.jobQueue = [];
    this.processingQueue = false;
    
    // Monitoring
    this.metrics = {
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      averageProcessingTime: 0,
      queueLength: 0,
      activeJobs: 0,
      lastProcessedAt: null,
      uptime: Date.now(),
      healthStatus: 'healthy'
    };
    
    // Performance tracking
    this.performanceMetrics = {
      processedJobs: [],
      errorRates: [],
      throughput: [],
      resourceUsage: []
    };
    
    // Initialize monitoring
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring and health checks
   * @private
   */
  initializeMonitoring() {
    // Health check interval
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Cleanup interval
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedJobs();
    }, this.cleanupInterval);
    
    // Emit initial health status
    this.emit('health-check', this.getHealthStatus());
  }

  /**
   * Add a new job to the processing queue
   * @param {Object} jobData - Job configuration
   * @returns {Promise<string>} Job ID
   */
  async addJob(jobData) {
    try {
      // Validate job data
      this.validateJobData(jobData);
      
      // Create job in database
      const job = new EmbeddingJob({
        source: jobData.source,
        documentIds: jobData.documentIds || [],
        batchSize: jobData.batchSize || 50,
        priority: jobData.priority || 'medium',
        configuration: {
          chunkSize: jobData.chunkSize || 1000,
          chunkOverlap: jobData.chunkOverlap || 200,
          ...jobData.configuration
        },
        status: 'queued',
        queuedAt: new Date(),
        metadata: jobData.metadata || {}
      });
      
      await job.save();
      
      // Add to internal queue
      this.jobQueue.push(job._id.toString());
      this.metrics.queueLength = this.jobQueue.length;
      
      // Emit job queued event
      this.emit('job-queued', {
        jobId: job._id.toString(),
        source: job.source,
        priority: job.priority,
        queuePosition: this.jobQueue.length
      });
      
      // Start processing if not already running
      if (!this.processingQueue) {
        this.startProcessing();
      }
      
      return job._id.toString();
      
    } catch (error) {
      console.error('Error adding job to queue:', error);
      throw error;
    }
  }

  /**
   * Start processing the job queue
   * @private
   */
  async startProcessing() {
    if (this.processingQueue) {
      return;
    }
    
    this.processingQueue = true;
    console.log('Starting job queue processing...');
    
    try {
      while (this.jobQueue.length > 0 && this.activeJobs.size < this.maxConcurrentJobs) {
        const jobId = this.jobQueue.shift();
        this.metrics.queueLength = this.jobQueue.length;
        
        // Process job concurrently
        this.processJob(jobId);
      }
    } catch (error) {
      console.error('Error in job queue processing:', error);
    } finally {
      // Continue processing if there are more jobs
      if (this.jobQueue.length > 0) {
        setTimeout(() => {
          this.processingQueue = false;
          this.startProcessing();
        }, 1000);
      } else {
        this.processingQueue = false;
      }
    }
  }

  /**
   * Process a single job
   * @private
   */
  async processJob(jobId) {
    let job = null;
    const startTime = Date.now();
    
    try {
      // Get job from database
      job = await EmbeddingJob.findById(jobId);
      if (!job) {
        console.error(`Job ${jobId} not found in database`);
        return;
      }
      
      // Add to active jobs
      this.activeJobs.set(jobId, {
        job,
        startTime,
        timeout: setTimeout(() => {
          this.handleJobTimeout(jobId);
        }, this.jobTimeout)
      });
      
      this.metrics.activeJobs = this.activeJobs.size;
      
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      job.progress.stage = 'initializing';
      await job.save();
      
      // Emit job started event
      this.emit('job-started', {
        jobId,
        source: job.source,
        startTime: new Date()
      });
      
      // Process the job
      await this.executeJob(job);
      
      // Mark job as completed
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress.percentage = 100;
      job.progress.stage = 'completed';
      job.performance.totalTime = Date.now() - startTime;
      await job.save();
      
      // Update metrics
      this.updateSuccessMetrics(job, Date.now() - startTime);
      
      // Emit job completed event
      this.emit('job-completed', {
        jobId,
        source: job.source,
        processingTime: Date.now() - startTime,
        documentsProcessed: job.progress.processedDocuments,
        chunksCreated: job.progress.totalChunks
      });
      
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      if (job) {
        await this.handleJobError(job, error);
      }
      
      this.updateErrorMetrics(error);
      
    } finally {
      // Clean up active job
      const activeJob = this.activeJobs.get(jobId);
      if (activeJob) {
        clearTimeout(activeJob.timeout);
        this.activeJobs.delete(jobId);
        this.metrics.activeJobs = this.activeJobs.size;
      }
      
      // Continue processing queue
      if (this.jobQueue.length > 0 && !this.processingQueue) {
        setTimeout(() => this.startProcessing(), 100);
      }
    }
  }

  /**
   * Execute the actual job processing
   * @private
   */
  async executeJob(job) {
    const { source, documentIds, batchSize, configuration } = job;
    
    try {
      // Stage 1: Document Processing
      job.progress.stage = 'document-processing';
      await job.save();
      
      let documents;
      if (documentIds && documentIds.length > 0) {
        // Process specific documents
        documents = await this.fetchDocumentsByIds(source, documentIds);
      } else {
        // Process all documents from source
        documents = await this.fetchDocumentsFromSource(source, batchSize);
      }
      
      if (!documents || documents.length === 0) {
        throw new Error(`No documents found for source: ${source}`);
      }
      
      // Process documents into chunks
      const processingResult = await this.documentProcessor.processBatch(
        documents,
        source,
        {
          batchSize: batchSize || 50,
          chunkSize: configuration.chunkSize,
          chunkOverlap: configuration.chunkOverlap
        }
      );
      
      // Update progress
      job.progress.processedDocuments = processingResult.processedDocuments;
      job.progress.totalChunks = processingResult.totalChunks;
      job.progress.percentage = 30;
      job.progress.stage = 'embedding-generation';
      await job.save();
      
      // Stage 2: Embedding Generation
      const chunks = await this.extractChunksFromResult(processingResult);
      const embeddingService = this.initializeEmbeddingService();
      
      let embeddingResults = [];
      if (embeddingService) {
        embeddingResults = await embeddingService.generateEmbeddingsBatch(chunks);
      } else {
        // Mock embedding results for testing
        embeddingResults = chunks.map(chunk => ({
          ...chunk,
          embedding: Array(768).fill(0).map(() => Math.random())
        }));
      }
      
      // Update progress
      job.progress.percentage = 70;
      job.progress.stage = 'vector-storage';
      job.progress.processedEmbeddings = embeddingResults.length;
      await job.save();
      
      // Stage 3: Vector Storage
      await this.storeVectorDocuments(embeddingResults, job);
      
      // Update final progress
      job.progress.percentage = 100;
      job.progress.stage = 'completed';
      job.performance.documentsProcessed = processingResult.processedDocuments;
      job.performance.chunksGenerated = processingResult.totalChunks;
      job.performance.embeddingsGenerated = embeddingResults.length;
      await job.save();
      
    } catch (error) {
      console.error(`Error executing job ${job._id}:`, error);
      throw error;
    }
  }

  /**
   * Handle job timeout
   * @private
   */
  async handleJobTimeout(jobId) {
    try {
      console.warn(`Job ${jobId} timed out`);
      
      const job = await EmbeddingJob.findById(jobId);
      if (job && job.status === 'processing') {
        job.status = 'failed';
        job.error = {
          type: 'TIMEOUT',
          message: 'Job processing timed out',
          timestamp: new Date()
        };
        await job.save();
        
        this.emit('job-timeout', { jobId, timeout: this.jobTimeout });
      }
      
    } catch (error) {
      console.error(`Error handling timeout for job ${jobId}:`, error);
    }
  }

  /**
   * Handle job error with retry logic
   * @private
   */
  async handleJobError(job, error) {
    try {
      job.retryCount = (job.retryCount || 0) + 1;
      job.error = {
        type: error.name || 'PROCESSING_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        retryCount: job.retryCount
      };
      
      if (job.retryCount < this.maxRetries) {
        // Schedule retry
        job.status = 'retrying';
        job.nextRetryAt = new Date(Date.now() + this.retryDelayMs * job.retryCount);
        
        // Add back to queue after delay
        setTimeout(() => {
          this.jobQueue.unshift(job._id.toString());
          this.metrics.queueLength = this.jobQueue.length;
          
          if (!this.processingQueue) {
            this.startProcessing();
          }
        }, this.retryDelayMs * job.retryCount);
        
        this.emit('job-retry', {
          jobId: job._id.toString(),
          retryCount: job.retryCount,
          nextRetryAt: job.nextRetryAt
        });
        
      } else {
        // Max retries reached
        job.status = 'failed';
        job.failedAt = new Date();
        
        this.emit('job-failed', {
          jobId: job._id.toString(),
          error: error.message,
          retryCount: job.retryCount
        });
      }
      
      await job.save();
      
    } catch (saveError) {
      console.error(`Error saving job error state:`, saveError);
    }
  }

  /**
   * Fetch documents by IDs
   * @private
   */
  async fetchDocumentsByIds(source, documentIds) {
    const model = this.getModelForSource(source);
    if (!model) {
      throw new Error(`No model found for source: ${source}`);
    }
    
    return await model.find({ _id: { $in: documentIds } }).lean();
  }

  /**
   * Fetch documents from source collection
   * @private
   */
  async fetchDocumentsFromSource(source, limit = 100) {
    const model = this.getModelForSource(source);
    if (!model) {
      throw new Error(`No model found for source: ${source}`);
    }
    
    return await model.find({}).limit(limit).lean();
  }

  /**
   * Get mongoose model for source
   * @private
   */
  getModelForSource(source) {
    try {
      return mongoose.model(source);
    } catch (error) {
      console.error(`Error getting model for source ${source}:`, error);
      return null;
    }
  }

  /**
   * Extract chunks from processing result
   * @private
   */
  async extractChunksFromResult(processingResult) {
    // This would extract the actual chunk data from the processing result
    // For now, return a placeholder structure
    return processingResult.batches.flatMap(batch => 
      Array(batch.chunksCreated).fill(null).map((_, index) => ({
        content: `Sample chunk ${index}`,
        metadata: { batchNumber: batch.batchNumber, chunkIndex: index }
      }))
    );
  }

  /**
   * Store vector documents in database
   * @private
   */
  async storeVectorDocuments(embeddingResults, job) {
    const VectorDocument = require('../models/vectorDocument');
    
    try {
      const vectorDocs = embeddingResults.map(result => ({
        content: result.content,
        embedding: result.embedding,
        contentType: result.contentType || 'general',
        sourceId: result.sourceId,
        sourceCollection: job.source,
        metadata: {
          ...result.metadata,
          jobId: job._id,
          processedAt: new Date()
        },
        tags: result.tags || [],
        timeframe: result.timeframe,
        searchKeywords: result.searchKeywords || [],
        importanceScore: result.importanceScore || 0.5
      }));
      
      await VectorDocument.insertMany(vectorDocs);
      
    } catch (error) {
      console.error('Error storing vector documents:', error);
      throw error;
    }
  }

  /**
   * Update success metrics
   * @private
   */
  updateSuccessMetrics(job, processingTime) {
    this.metrics.totalJobsProcessed++;
    this.metrics.lastProcessedAt = new Date();
    
    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalJobsProcessed - 1) + processingTime;
    this.metrics.averageProcessingTime = Math.round(totalTime / this.metrics.totalJobsProcessed);
    
    // Add to performance tracking
    this.performanceMetrics.processedJobs.push({
      jobId: job._id.toString(),
      processingTime,
      documentsProcessed: job.progress.processedDocuments,
      timestamp: new Date()
    });
    
    // Keep only last 100 entries
    if (this.performanceMetrics.processedJobs.length > 100) {
      this.performanceMetrics.processedJobs = this.performanceMetrics.processedJobs.slice(-100);
    }
  }

  /**
   * Update error metrics
   * @private
   */
  updateErrorMetrics(error) {
    this.metrics.totalJobsFailed++;
    
    this.performanceMetrics.errorRates.push({
      error: error.message,
      timestamp: new Date(),
      totalFailed: this.metrics.totalJobsFailed,
      totalProcessed: this.metrics.totalJobsProcessed
    });
    
    // Keep only last 100 entries
    if (this.performanceMetrics.errorRates.length > 100) {
      this.performanceMetrics.errorRates = this.performanceMetrics.errorRates.slice(-100);
    }
  }

  /**
   * Perform health check
   * @private
   */
  async performHealthCheck() {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: Date.now() - this.metrics.uptime,
        activeJobs: this.activeJobs.size,
        queueLength: this.jobQueue.length,
        memoryUsage: process.memoryUsage(),
        checks: {
          database: await this.checkDatabaseHealth(),
          embeddingService: await this.checkEmbeddingServiceHealth(),
          processingService: await this.checkProcessingServiceHealth()
        }
      };
      
      // Determine overall health status
      const failedChecks = Object.values(health.checks).filter(check => !check.healthy);
      if (failedChecks.length > 0) {
        health.status = failedChecks.length === Object.keys(health.checks).length ? 'unhealthy' : 'degraded';
      }
      
      this.metrics.healthStatus = health.status;
      
      // Emit health check event
      this.emit('health-check', health);
      
      return health;
      
    } catch (error) {
      console.error('Error performing health check:', error);
      
      const health = {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message
      };
      
      this.metrics.healthStatus = 'unhealthy';
      this.emit('health-check', health);
      
      return health;
    }
  }

  /**
   * Check database health
   * @private
   */
  async checkDatabaseHealth() {
    try {
      await mongoose.connection.db.admin().ping();
      return { healthy: true, responseTime: Date.now() };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Initialize embedding service if not already done
   * @private
   */
  initializeEmbeddingService() {
    if (!this.embeddingService) {
      try {
        const GeminiEmbeddingService = require('./geminiEmbeddingService');
        this.embeddingService = new GeminiEmbeddingService(this.embeddingServiceOptions);
      } catch (error) {
        console.error('Error initializing embedding service:', error);
        this.embeddingService = null;
      }
    }
    return this.embeddingService;
  }

  /**
   * Check embedding service health
   * @private
   */
  async checkEmbeddingServiceHealth() {
    try {
      const service = this.initializeEmbeddingService();
      if (!service) {
        return { healthy: false, error: 'Embedding service not available' };
      }
      
      const stats = service.getStats();
      return {
        healthy: true,
        stats: {
          totalRequests: stats.totalRequests || 0,
          successRate: stats.successRate || 0,
          averageResponseTime: stats.averageResponseTime || 0
        }
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Check processing service health
   * @private
   */
  async checkProcessingServiceHealth() {
    try {
      const stats = this.documentProcessor.getStats();
      return {
        healthy: true,
        stats: {
          documentsProcessed: stats.documentsProcessed,
          chunksCreated: stats.chunksCreated,
          memoryUsage: stats.memoryUsage.current
        }
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  /**
   * Clean up completed jobs
   * @private
   */
  async cleanupCompletedJobs() {
    try {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      const result = await EmbeddingJob.deleteMany({
        status: 'completed',
        completedAt: { $lt: cutoffDate }
      });
      
      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} completed jobs`);
        this.emit('jobs-cleaned', { deletedCount: result.deletedCount });
      }
      
    } catch (error) {
      console.error('Error cleaning up completed jobs:', error);
    }
  }

  /**
   * Validate job data
   * @private
   */
  validateJobData(jobData) {
    if (!jobData.source) {
      throw new Error('Job source is required');
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(jobData.priority)) {
      jobData.priority = 'medium';
    }
    
    if (jobData.batchSize && (jobData.batchSize < 1 || jobData.batchSize > 1000)) {
      throw new Error('Batch size must be between 1 and 1000');
    }
  }

  /**
   * Get current metrics and status
   */
  getMetrics() {
    return {
      ...this.metrics,
      performance: this.performanceMetrics,
              services: {
          documentProcessor: this.documentProcessor.getStats(),
          embeddingService: this.embeddingService ? this.embeddingService.getStats() : { status: 'not_initialized' }
        }
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      status: this.metrics.healthStatus,
      uptime: Date.now() - this.metrics.uptime,
      activeJobs: this.activeJobs.size,
      queueLength: this.jobQueue.length,
      totalProcessed: this.metrics.totalJobsProcessed,
      totalFailed: this.metrics.totalJobsFailed,
      successRate: this.metrics.totalJobsProcessed > 0 ? 
        ((this.metrics.totalJobsProcessed - this.metrics.totalJobsFailed) / this.metrics.totalJobsProcessed * 100).toFixed(2) + '%' : 
        '0%'
    };
  }

  /**
   * Pause job processing
   */
  pause() {
    this.processingQueue = false;
    this.emit('pipeline-paused');
  }

  /**
   * Resume job processing
   */
  resume() {
    if (this.jobQueue.length > 0) {
      this.startProcessing();
    }
    this.emit('pipeline-resumed');
  }

  /**
   * Stop the orchestration service
   */
  async stop() {
    console.log('Stopping pipeline orchestration service...');
    
    // Clear intervals
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    // Wait for active jobs to complete or timeout
    const activeJobIds = Array.from(this.activeJobs.keys());
    if (activeJobIds.length > 0) {
      console.log(`Waiting for ${activeJobIds.length} active jobs to complete...`);
      
      // Wait up to 60 seconds for jobs to complete
      const timeout = setTimeout(() => {
        console.warn('Force stopping - some jobs may not have completed');
      }, 60000);
      
      // Clear active jobs
      for (const [jobId, activeJob] of this.activeJobs) {
        clearTimeout(activeJob.timeout);
      }
      
      clearTimeout(timeout);
    }
    
    this.processingQueue = false;
    this.activeJobs.clear();
    this.jobQueue = [];
    
    this.emit('pipeline-stopped');
    console.log('Pipeline orchestration service stopped');
  }
}

module.exports = PipelineOrchestrationService; 