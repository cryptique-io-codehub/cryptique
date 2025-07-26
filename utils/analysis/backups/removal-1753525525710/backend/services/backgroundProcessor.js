/**
 * Background Processing Service
 * Handles job queuing, scheduling, and processing for heavy operations
 */

const EventEmitter = require('events');
const cacheService = require('./cacheService');

class BackgroundProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxConcurrentJobs: options.maxConcurrentJobs || 3,
      jobTimeout: options.jobTimeout || 300000, // 5 minutes
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      cleanupInterval: options.cleanupInterval || 60000, // 1 minute
      maxQueueSize: options.maxQueueSize || 1000
    };
    
    // Job queue and processing state
    this.jobQueue = [];
    this.processingJobs = new Map();
    this.completedJobs = new Map();
    this.failedJobs = new Map();
    this.isProcessing = false;
    
    // Statistics
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      retriedJobs: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      processingCount: 0
    };
    
    // Start background processing
    this.startProcessing();
    this.startCleanup();
    this.startStatsScheduler();
    
    console.log('🚀 BackgroundProcessor initialized');
  }
  
  /**
   * Add a job to the processing queue
   * @param {Object} jobData - Job configuration
   * @returns {string} Job ID
   */
  queueJob(jobData) {
    const job = {
      id: this.generateJobId(),
      type: jobData.type,
      data: jobData.data || {},
      priority: jobData.priority || 5, // 1-10, lower is higher priority
      attempts: 0,
      maxAttempts: jobData.maxAttempts || this.config.retryAttempts,
      timeout: jobData.timeout || this.config.jobTimeout,
      createdAt: new Date(),
      scheduledFor: jobData.scheduledFor || new Date(),
      status: 'queued',
      progress: 0,
      result: null,
      error: null
    };
    
    // Check queue size limit
    if (this.jobQueue.length >= this.config.maxQueueSize) {
      throw new Error('Job queue is full');
    }
    
    // Insert job in priority order
    this.insertJobByPriority(job);
    
    this.stats.totalJobs++;
    this.stats.queueSize = this.jobQueue.length;
    
    console.log(`📋 Job queued: ${job.id} (${job.type})`);
    this.emit('jobQueued', job);
    
    return job.id;
  }
  
  /**
   * Insert job into queue maintaining priority order
   * @param {Object} job - Job to insert
   */
  insertJobByPriority(job) {
    let insertIndex = this.jobQueue.length;
    
    // Find insertion point based on priority and scheduled time
    for (let i = 0; i < this.jobQueue.length; i++) {
      const queuedJob = this.jobQueue[i];
      
      // Higher priority (lower number) goes first
      if (job.priority < queuedJob.priority) {
        insertIndex = i;
        break;
      }
      
      // Same priority, check scheduled time
      if (job.priority === queuedJob.priority && job.scheduledFor < queuedJob.scheduledFor) {
        insertIndex = i;
        break;
      }
    }
    
    this.jobQueue.splice(insertIndex, 0, job);
  }
  
  /**
   * Start the background processing loop
   */
  startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processJobs();
  }
  
  /**
   * Stop the background processing
   */
  stopProcessing() {
    this.isProcessing = false;
    console.log('⏹️ Background processing stopped');
  }
  
  /**
   * Main job processing loop
   */
  async processJobs() {
    while (this.isProcessing) {
      try {
        // Check if we can process more jobs
        if (this.processingJobs.size >= this.config.maxConcurrentJobs) {
          await this.sleep(1000); // Wait 1 second
          continue;
        }
        
        // Get next job to process
        const job = this.getNextJob();
        if (!job) {
          await this.sleep(1000); // No jobs available, wait
          continue;
        }
        
        // Process the job
        this.processJob(job);
        
      } catch (error) {
        console.error('❌ Error in job processing loop:', error);
        await this.sleep(5000); // Wait 5 seconds on error
      }
    }
  }
  
  /**
   * Get the next job to process
   * @returns {Object|null} Next job or null if none available
   */
  getNextJob() {
    const now = new Date();
    
    for (let i = 0; i < this.jobQueue.length; i++) {
      const job = this.jobQueue[i];
      
      // Check if job is ready to be processed
      if (job.scheduledFor <= now) {
        // Remove from queue
        this.jobQueue.splice(i, 1);
        this.stats.queueSize = this.jobQueue.length;
        return job;
      }
    }
    
    return null;
  }
  
  /**
   * Process a single job
   * @param {Object} job - Job to process
   */
  async processJob(job) {
    job.status = 'processing';
    job.startedAt = new Date();
    job.attempts++;
    
    this.processingJobs.set(job.id, job);
    this.stats.processingCount = this.processingJobs.size;
    
    console.log(`⚡ Processing job: ${job.id} (${job.type}) - Attempt ${job.attempts}`);
    this.emit('jobStarted', job);
    
    try {
      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeout);
      });
      
      // Execute the job
      const jobPromise = this.executeJob(job);
      
      // Race between job execution and timeout
      const result = await Promise.race([jobPromise, timeoutPromise]);
      
      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      job.progress = 100;
      
      this.processingJobs.delete(job.id);
      this.completedJobs.set(job.id, job);
      
      this.stats.completedJobs++;
      this.stats.processingCount = this.processingJobs.size;
      this.updateAverageProcessingTime(job);
      
      console.log(`✅ Job completed: ${job.id} (${job.type})`);
      this.emit('jobCompleted', job);
      
    } catch (error) {
      console.error(`❌ Job failed: ${job.id} (${job.type})`, error);
      
      job.error = error.message;
      job.failedAt = new Date();
      
      // Check if we should retry
      if (job.attempts < job.maxAttempts) {
        job.status = 'retrying';
        
        // Calculate retry delay with exponential backoff
        const retryDelay = this.config.retryDelay * Math.pow(2, job.attempts - 1);
        job.scheduledFor = new Date(Date.now() + retryDelay);
        
        // Re-queue the job
        this.processingJobs.delete(job.id);
        this.insertJobByPriority(job);
        this.stats.queueSize = this.jobQueue.length;
        this.stats.retriedJobs++;
        
        console.log(`🔄 Job retry scheduled: ${job.id} in ${retryDelay}ms`);
        this.emit('jobRetry', job);
        
      } else {
        // Job failed permanently
        job.status = 'failed';
        
        this.processingJobs.delete(job.id);
        this.failedJobs.set(job.id, job);
        
        this.stats.failedJobs++;
        this.stats.processingCount = this.processingJobs.size;
        
        console.log(`💀 Job failed permanently: ${job.id} (${job.type})`);
        this.emit('jobFailed', job);
      }
    }
  }
  
  /**
   * Execute a specific job based on its type
   * @param {Object} job - Job to execute
   * @returns {Promise<any>} Job result
   */
  async executeJob(job) {
    switch (job.type) {
      case 'user_journey_processing':
        return await this.processUserJourneys(job);
        
      case 'stats_aggregation':
        return await this.aggregateStats(job);
        
      case 'cache_warming':
        return await this.warmCache(job);
        
      case 'data_cleanup':
        return await this.cleanupData(job);
        
      case 'analytics_computation':
        return await this.computeAnalytics(job);
        
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }
  
  /**
   * Process user journeys for a site
   * @param {Object} job - Job data
   * @returns {Promise<Object>} Processing result
   */
  async processUserJourneys(job) {
    const { siteId } = job.data;
    
    if (!siteId) {
      throw new Error('Site ID is required for user journey processing');
    }
    
    // Update progress
    job.progress = 10;
    this.emit('jobProgress', job);
    
    // Import AnalyticsProcessor dynamically to avoid circular dependencies
    const AnalyticsProcessor = require('../utils/analyticsProcessor');
    
    job.progress = 30;
    this.emit('jobProgress', job);
    
    // Process the user journeys
    const result = await AnalyticsProcessor.processAllUserJourneys(siteId);
    
    job.progress = 80;
    this.emit('jobProgress', job);
    
    // Invalidate related cache entries
    cacheService.invalidate(`journeys:${siteId}:*`);
    cacheService.invalidate(`analytics:${siteId}:*`);
    
    job.progress = 100;
    this.emit('jobProgress', job);
    
    return {
      type: 'user_journey_processing',
      siteId,
      ...result,
      processedAt: new Date()
    };
  }
  
  /**
   * Aggregate statistics for a site
   * @param {Object} job - Job data
   * @returns {Promise<Object>} Aggregation result
   */
  async aggregateStats(job) {
    const { siteId, timeframe, timestamp } = job.data;
    
    if (!siteId || !timeframe) {
      throw new Error('Site ID and timeframe are required for stats aggregation');
    }
    
    job.progress = 20;
    this.emit('jobProgress', job);
    
    // Import stats aggregation service
    const statsAggregationService = require('./statsAggregationService');
    
    job.progress = 40;
    this.emit('jobProgress', job);
    
    // Use provided timestamp or calculate appropriate one
    const aggregationTimestamp = timestamp 
      ? new Date(timestamp)
      : statsAggregationService.getAggregationTimestamp(timeframe);
    
    job.progress = 60;
    this.emit('jobProgress', job);
    
    // Perform the aggregation
    const result = await statsAggregationService.aggregateStats(
      siteId, 
      timeframe, 
      aggregationTimestamp
    );
    
    job.progress = 90;
    this.emit('jobProgress', job);
    
    // Invalidate related cache
    cacheService.invalidate(`stats:${siteId}:*`);
    cacheService.invalidate(`charts:${siteId}:*`);
    cacheService.invalidate(`aggregated:stats:${siteId}:*`);
    
    return {
      type: 'stats_aggregation',
      siteId,
      timeframe,
      timestamp: aggregationTimestamp,
      ...result,
      aggregatedAt: new Date()
    };
  }
  
  /**
   * Warm cache for a site
   * @param {Object} job - Job data
   * @returns {Promise<Object>} Cache warming result
   */
  async warmCache(job) {
    const { siteId } = job.data;
    
    if (!siteId) {
      throw new Error('Site ID is required for cache warming');
    }
    
    job.progress = 25;
    this.emit('jobProgress', job);
    
    const { warmSiteCache } = require('../config/cacheConfig');
    const result = await warmSiteCache(siteId);
    
    job.progress = 100;
    this.emit('jobProgress', job);
    
    return {
      type: 'cache_warming',
      ...result,
      warmedAt: new Date()
    };
  }
  
  /**
   * Clean up old data
   * @param {Object} job - Job data
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupData(job) {
    const { type, olderThan } = job.data;
    
    job.progress = 20;
    this.emit('jobProgress', job);
    
    let cleanedCount = 0;
    
    if (type === 'completed_jobs') {
      // Clean up old completed jobs
      const cutoffDate = new Date(Date.now() - (olderThan || 24 * 60 * 60 * 1000)); // 24 hours default
      
      for (const [jobId, completedJob] of this.completedJobs.entries()) {
        if (completedJob.completedAt < cutoffDate) {
          this.completedJobs.delete(jobId);
          cleanedCount++;
        }
      }
    }
    
    job.progress = 100;
    this.emit('jobProgress', job);
    
    return {
      type: 'data_cleanup',
      cleanupType: type,
      cleanedCount,
      cleanedAt: new Date()
    };
  }
  
  /**
   * Compute analytics
   * @param {Object} job - Job data
   * @returns {Promise<Object>} Computation result
   */
  async computeAnalytics(job) {
    const { siteId, computationType } = job.data;
    
    job.progress = 30;
    this.emit('jobProgress', job);
    
    // Placeholder for analytics computation
    // This would contain specific analytics calculations
    
    job.progress = 100;
    this.emit('jobProgress', job);
    
    return {
      type: 'analytics_computation',
      siteId,
      computationType,
      computedAt: new Date()
    };
  }
  
  /**
   * Get job status by ID
   * @param {string} jobId - Job ID
   * @returns {Object|null} Job status or null if not found
   */
  getJobStatus(jobId) {
    // Check processing jobs
    if (this.processingJobs.has(jobId)) {
      return this.processingJobs.get(jobId);
    }
    
    // Check completed jobs
    if (this.completedJobs.has(jobId)) {
      return this.completedJobs.get(jobId);
    }
    
    // Check failed jobs
    if (this.failedJobs.has(jobId)) {
      return this.failedJobs.get(jobId);
    }
    
    // Check queued jobs
    const queuedJob = this.jobQueue.find(job => job.id === jobId);
    if (queuedJob) {
      return queuedJob;
    }
    
    return null;
  }
  
  /**
   * Get processing statistics
   * @returns {Object} Processing statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.jobQueue.length,
      processingCount: this.processingJobs.size,
      completedJobsCount: this.completedJobs.size,
      failedJobsCount: this.failedJobs.size,
      uptime: Date.now() - this.startTime,
      isProcessing: this.isProcessing
    };
  }
  
  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return {
      queueSize: this.jobQueue.length,
      processingCount: this.processingJobs.size,
      nextJobs: this.jobQueue.slice(0, 5).map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority,
        scheduledFor: job.scheduledFor,
        attempts: job.attempts
      })),
      processingJobs: Array.from(this.processingJobs.values()).map(job => ({
        id: job.id,
        type: job.type,
        progress: job.progress,
        startedAt: job.startedAt
      }))
    };
  }
  
  /**
   * Cancel a job
   * @param {string} jobId - Job ID to cancel
   * @returns {boolean} Success status
   */
  cancelJob(jobId) {
    // Remove from queue
    const queueIndex = this.jobQueue.findIndex(job => job.id === jobId);
    if (queueIndex !== -1) {
      const job = this.jobQueue.splice(queueIndex, 1)[0];
      job.status = 'cancelled';
      job.cancelledAt = new Date();
      this.stats.queueSize = this.jobQueue.length;
      
      console.log(`🚫 Job cancelled: ${jobId}`);
      this.emit('jobCancelled', job);
      return true;
    }
    
    // Note: Cannot cancel jobs that are already processing
    return false;
  }
  
  /**
   * Helper methods
   */
  generateJobId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  updateAverageProcessingTime(job) {
    const processingTime = job.completedAt - job.startedAt;
    const totalCompleted = this.stats.completedJobs;
    
    this.stats.averageProcessingTime = 
      ((this.stats.averageProcessingTime * (totalCompleted - 1)) + processingTime) / totalCompleted;
  }
  
  /**
   * Start cleanup process for old jobs
   */
  startCleanup() {
    setInterval(() => {
      this.queueJob({
        type: 'data_cleanup',
        data: { type: 'completed_jobs', olderThan: 24 * 60 * 60 * 1000 }, // 24 hours
        priority: 10 // Low priority
      });
    }, this.config.cleanupInterval);
  }
}

// Create singleton instance
const backgroundProcessor = new BackgroundProcessor();

module.exports = backgroundProcessor;