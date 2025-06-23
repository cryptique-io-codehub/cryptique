#!/usr/bin/env node

const cluster = require('cluster');
const logger = require('../config/logger');
const { connectToDatabase } = require('../config/database');
const DocumentProcessingService = require('../services/documentProcessingService');
const PipelineOrchestrationService = require('../services/pipelineOrchestrationService');
const GeminiEmbeddingService = require('../services/geminiEmbeddingService');

// Set process title
process.title = `cryptique-rag-worker-${process.env.INSTANCE_ID || cluster.worker?.id || 'main'}`;

class RAGWorker {
  constructor() {
    this.isShuttingDown = false;
    this.activeJobs = new Map();
    
    // Initialize services
    this.documentProcessor = new DocumentProcessingService({
      chunkSize: parseInt(process.env.RAG_CHUNK_SIZE) || 1000,
      chunkOverlap: parseInt(process.env.RAG_CHUNK_OVERLAP) || 200,
      batchSize: parseInt(process.env.RAG_BATCH_SIZE) || 10,
      maxConcurrentJobs: parseInt(process.env.RAG_MAX_CONCURRENT) || 2
    });
    
    this.pipelineOrchestrator = new PipelineOrchestrationService({
      maxConcurrentJobs: parseInt(process.env.RAG_MAX_CONCURRENT) || 2,
      maxRetries: parseInt(process.env.RAG_MAX_RETRIES) || 3,
      retryDelayMs: parseInt(process.env.RAG_RETRY_DELAY) || 5000,
      healthCheckInterval: parseInt(process.env.RAG_HEALTH_CHECK_INTERVAL) || 30000
    });
    
    this.embeddingService = new GeminiEmbeddingService({
      apiKey: process.env.GEMINI_API,
      rateLimit: parseInt(process.env.GEMINI_RATE_LIMIT) || 60,
      rateLimitWindow: parseInt(process.env.GEMINI_RATE_WINDOW) || 60000,
      maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES) || 3
    });
    
    // Performance monitoring
    this.stats = {
      startTime: Date.now(),
      jobsProcessed: 0,
      jobsFailed: 0,
      documentsProcessed: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      averageJobTime: 0,
      peakMemoryUsage: 0
    };
    
    // Setup event handlers
    this.setupEventHandlers();
    
    logger.info('RAG Worker initialized', {
      workerId: process.env.INSTANCE_ID || cluster.worker?.id,
      pid: process.pid,
      nodeEnv: process.env.NODE_ENV
    });
  }

  /**
   * Setup event handlers for services
   */
  setupEventHandlers() {
    // Pipeline orchestrator events
    this.pipelineOrchestrator.on('job-started', (data) => {
      this.activeJobs.set(data.jobId, {
        startTime: Date.now(),
        source: data.source
      });
      
      logger.logJob('Job started', {
        jobId: data.jobId,
        source: data.source,
        workerId: process.env.INSTANCE_ID
      });
    });
    
    this.pipelineOrchestrator.on('job-completed', (data) => {
      const jobInfo = this.activeJobs.get(data.jobId);
      if (jobInfo) {
        const processingTime = Date.now() - jobInfo.startTime;
        this.updateStats('completed', processingTime, data);
        this.activeJobs.delete(data.jobId);
      }
      
      logger.logJob('Job completed', {
        jobId: data.jobId,
        source: data.source,
        processingTime: data.processingTime,
        documentsProcessed: data.documentsProcessed,
        chunksCreated: data.chunksCreated,
        workerId: process.env.INSTANCE_ID
      });
    });
    
    this.pipelineOrchestrator.on('job-failed', (data) => {
      const jobInfo = this.activeJobs.get(data.jobId);
      if (jobInfo) {
        const processingTime = Date.now() - jobInfo.startTime;
        this.updateStats('failed', processingTime);
        this.activeJobs.delete(data.jobId);
      }
      
      logger.error('Job failed', {
        jobId: data.jobId,
        error: data.error,
        retryCount: data.retryCount,
        workerId: process.env.INSTANCE_ID
      });
    });
    
    this.pipelineOrchestrator.on('health-check', (health) => {
      logger.logPerformance('Health check completed', {
        status: health.status,
        activeJobs: health.activeJobs,
        queueLength: health.queueLength,
        memoryUsage: health.memoryUsage,
        workerId: process.env.INSTANCE_ID
      });
    });
    
    // Embedding service events
    this.embeddingService.on('stats', (stats) => {
      logger.logPerformance('Embedding service stats', {
        ...stats,
        workerId: process.env.INSTANCE_ID
      });
    });
    
    this.embeddingService.on('rate-limit', (data) => {
      logger.warn('Rate limit encountered', {
        waitTime: data.waitTime,
        workerId: process.env.INSTANCE_ID
      });
    });
  }

  /**
   * Update worker statistics
   */
  updateStats(type, processingTime, jobData = {}) {
    if (type === 'completed') {
      this.stats.jobsProcessed++;
      this.stats.documentsProcessed += jobData.documentsProcessed || 0;
      this.stats.chunksCreated += jobData.chunksCreated || 0;
      
      // Update average job time
      this.stats.averageJobTime = (
        (this.stats.averageJobTime * (this.stats.jobsProcessed - 1) + processingTime) / 
        this.stats.jobsProcessed
      );
    } else if (type === 'failed') {
      this.stats.jobsFailed++;
    }
    
    // Update peak memory usage
    const memoryUsage = process.memoryUsage();
    this.stats.peakMemoryUsage = Math.max(this.stats.peakMemoryUsage, memoryUsage.heapUsed);
  }

  /**
   * Start the RAG worker
   */
  async start() {
    try {
      logger.info('Starting RAG Worker...', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid
      });
      
      // Connect to database
      await connectToDatabase();
      logger.info('Database connected successfully');
      
      // Start services
      this.embeddingService.startMonitoring();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start performance reporting
      this.startPerformanceReporting();
      
      // Signal that worker is ready
      if (process.send) {
        process.send('ready');
      }
      
      logger.info('RAG Worker started successfully', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid,
        uptime: Date.now() - this.stats.startTime
      });
      
    } catch (error) {
      logger.error('Failed to start RAG Worker', {
        error: error.message,
        stack: error.stack,
        workerId: process.env.INSTANCE_ID
      });
      process.exit(1);
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      logger.logPerformance('Worker health check', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid,
        uptime: Date.now() - this.stats.startTime,
        memoryUsageMB: memoryMB,
        activeJobs: this.activeJobs.size,
        jobsProcessed: this.stats.jobsProcessed,
        jobsFailed: this.stats.jobsFailed,
        successRate: this.stats.jobsProcessed > 0 ? 
          ((this.stats.jobsProcessed - this.stats.jobsFailed) / this.stats.jobsProcessed * 100).toFixed(2) : 100
      });
      
      // Memory usage warning
      if (memoryMB > 1500) { // 1.5GB warning
        logger.warn('High memory usage detected', {
          memoryUsageMB: memoryMB,
          workerId: process.env.INSTANCE_ID
        });
      }
      
    }, 30000); // Every 30 seconds
  }

  /**
   * Start performance reporting
   */
  startPerformanceReporting() {
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      logger.logPerformance('Worker performance report', {
        workerId: process.env.INSTANCE_ID,
        stats: this.stats,
        activeJobs: Array.from(this.activeJobs.entries()).map(([jobId, info]) => ({
          jobId,
          source: info.source,
          runningTime: Date.now() - info.startTime
        }))
      });
      
    }, 300000); // Every 5 minutes
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    logger.info('RAG Worker shutting down...', {
      workerId: process.env.INSTANCE_ID,
      activeJobs: this.activeJobs.size
    });
    
    try {
      // Wait for active jobs to complete (max 30 seconds)
      const shutdownTimeout = setTimeout(() => {
        logger.warn('Shutdown timeout reached, forcing exit', {
          workerId: process.env.INSTANCE_ID,
          remainingJobs: this.activeJobs.size
        });
        process.exit(1);
      }, 30000);
      
      // Wait for active jobs
      while (this.activeJobs.size > 0) {
        logger.info(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      clearTimeout(shutdownTimeout);
      
      // Stop services
      if (this.pipelineOrchestrator) {
        await this.pipelineOrchestrator.stop();
      }
      
      logger.info('RAG Worker shutdown completed', {
        workerId: process.env.INSTANCE_ID,
        totalJobsProcessed: this.stats.jobsProcessed,
        uptime: Date.now() - this.stats.startTime
      });
      
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during shutdown', {
        error: error.message,
        workerId: process.env.INSTANCE_ID
      });
      process.exit(1);
    }
  }
}

// Initialize and start worker
const worker = new RAGWorker();

// Handle graceful shutdown
process.on('SIGTERM', () => worker.shutdown());
process.on('SIGINT', () => worker.shutdown());
process.on('message', (msg) => {
  if (msg === 'shutdown') {
    worker.shutdown();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in RAG Worker', {
    error: error.message,
    stack: error.stack,
    workerId: process.env.INSTANCE_ID
  });
  worker.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in RAG Worker', {
    reason: reason,
    promise: promise,
    workerId: process.env.INSTANCE_ID
  });
  worker.shutdown();
});

// Start the worker
worker.start().catch((error) => {
  logger.error('Failed to start RAG Worker', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}); 