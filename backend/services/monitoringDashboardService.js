const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');
const VectorDocument = require('../models/vectorDocument');

class MonitoringDashboardService {
  constructor(options = {}) {
    this.refreshInterval = options.refreshInterval || 5000; // 5 seconds
    this.retentionPeriod = options.retentionPeriod || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.alertThresholds = {
      errorRate: options.errorRateThreshold || 0.1, // 10%
      responseTime: options.responseTimeThreshold || 5000, // 5 seconds
      queueLength: options.queueLengthThreshold || 100,
      memoryUsage: options.memoryUsageThreshold || 0.8, // 80%
      ...options.alertThresholds
    };
    
    this.cache = {
      lastUpdate: null,
      metrics: null,
      alerts: []
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring dashboard
   */
  start() {
    if (this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.updateMetrics();
    }, this.refreshInterval);
    
    console.log('Monitoring dashboard started');
  }

  /**
   * Stop monitoring dashboard
   */
  stop() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('Monitoring dashboard stopped');
  }

  /**
   * Update all metrics
   * @private
   */
  async updateMetrics() {
    try {
      const metrics = await this.collectMetrics();
      this.cache.metrics = metrics;
      this.cache.lastUpdate = new Date();
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  }

  /**
   * Collect comprehensive metrics
   */
  async collectMetrics() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    try {
      // Parallel data collection for performance
      const [
        jobMetrics,
        systemMetrics,
        performanceMetrics,
        healthMetrics,
        vectorMetrics
      ] = await Promise.all([
        this.collectJobMetrics(oneDayAgo, oneHourAgo),
        this.collectSystemMetrics(),
        this.collectPerformanceMetrics(oneDayAgo),
        this.collectHealthMetrics(),
        this.collectVectorMetrics()
      ]);
      
      return {
        timestamp: now,
        jobs: jobMetrics,
        system: systemMetrics,
        performance: performanceMetrics,
        health: healthMetrics,
        vectors: vectorMetrics,
        alerts: this.cache.alerts
      };
      
    } catch (error) {
      console.error('Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Collect job-related metrics
   * @private
   */
  async collectJobMetrics(oneDayAgo, oneHourAgo) {
    try {
      const [
        totalJobs,
        completedJobs,
        failedJobs,
        activeJobs,
        queuedJobs,
        recentJobs,
        jobsBySource,
        jobsByPriority,
        averageProcessingTime
      ] = await Promise.all([
        EmbeddingJob.countDocuments({}),
        EmbeddingJob.countDocuments({ status: 'completed' }),
        EmbeddingJob.countDocuments({ status: 'failed' }),
        EmbeddingJob.countDocuments({ status: 'processing' }),
        EmbeddingJob.countDocuments({ status: 'queued' }),
        EmbeddingJob.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        this.getJobsBySource(),
        this.getJobsByPriority(),
        this.getAverageProcessingTime(oneDayAgo)
      ]);
      
      const successRate = totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(2) : 0;
      const errorRate = totalJobs > 0 ? ((failedJobs / totalJobs) * 100).toFixed(2) : 0;
      
      return {
        total: totalJobs,
        completed: completedJobs,
        failed: failedJobs,
        active: activeJobs,
        queued: queuedJobs,
        recent: recentJobs,
        successRate: parseFloat(successRate),
        errorRate: parseFloat(errorRate),
        averageProcessingTime,
        bySource: jobsBySource,
        byPriority: jobsByPriority
      };
      
    } catch (error) {
      console.error('Error collecting job metrics:', error);
      return {
        total: 0,
        completed: 0,
        failed: 0,
        active: 0,
        queued: 0,
        recent: 0,
        successRate: 0,
        errorRate: 0,
        averageProcessingTime: 0,
        bySource: {},
        byPriority: {}
      };
    }
  }

  /**
   * Collect system metrics
   * @private
   */
  collectSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2),
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      pid: process.pid
    };
  }

  /**
   * Collect performance metrics
   * @private
   */
  async collectPerformanceMetrics(oneDayAgo) {
    try {
      const [
        avgResponseTime,
        throughput,
        peakMemoryUsage,
        errorTrends,
        processingTrends
      ] = await Promise.all([
        this.getAverageResponseTime(oneDayAgo),
        this.getThroughput(oneDayAgo),
        this.getPeakMemoryUsage(oneDayAgo),
        this.getErrorTrends(oneDayAgo),
        this.getProcessingTrends(oneDayAgo)
      ]);
      
      return {
        averageResponseTime: avgResponseTime,
        throughput: throughput,
        peakMemoryUsage: peakMemoryUsage,
        errorTrends: errorTrends,
        processingTrends: processingTrends
      };
      
    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      return {
        averageResponseTime: 0,
        throughput: 0,
        peakMemoryUsage: 0,
        errorTrends: [],
        processingTrends: []
      };
    }
  }

  /**
   * Collect health metrics
   * @private
   */
  async collectHealthMetrics() {
    try {
      const [
        dbHealth,
        apiHealth,
        serviceHealth
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkApiHealth(),
        this.checkServiceHealth()
      ]);
      
      const overallHealth = dbHealth.healthy && apiHealth.healthy && serviceHealth.healthy ? 
        'healthy' : 'degraded';
      
      return {
        overall: overallHealth,
        database: dbHealth,
        api: apiHealth,
        services: serviceHealth,
        lastChecked: new Date()
      };
      
    } catch (error) {
      console.error('Error collecting health metrics:', error);
      return {
        overall: 'unhealthy',
        database: { healthy: false, error: error.message },
        api: { healthy: false, error: error.message },
        services: { healthy: false, error: error.message },
        lastChecked: new Date()
      };
    }
  }

  /**
   * Collect vector database metrics
   * @private
   */
  async collectVectorMetrics() {
    try {
      const [
        totalDocuments,
        documentsToday,
        avgEmbeddingDimensions,
        storageSize,
        indexStatus
      ] = await Promise.all([
        VectorDocument.countDocuments({}),
        this.getDocumentsToday(),
        this.getAverageEmbeddingDimensions(),
        this.getStorageSize(),
        this.getIndexStatus()
      ]);
      
      return {
        totalDocuments,
        documentsToday,
        avgEmbeddingDimensions,
        storageSize,
        indexStatus
      };
      
    } catch (error) {
      console.error('Error collecting vector metrics:', error);
      return {
        totalDocuments: 0,
        documentsToday: 0,
        avgEmbeddingDimensions: 0,
        storageSize: 0,
        indexStatus: 'unknown'
      };
    }
  }

  /**
   * Get jobs by source
   * @private
   */
  async getJobsBySource() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];
      
      const results = await EmbeddingJob.aggregate(pipeline);
      
      const sourceMetrics = {};
      results.forEach(result => {
        sourceMetrics[result._id] = {
          total: result.count,
          completed: result.completed,
          failed: result.failed,
          successRate: result.count > 0 ? 
            ((result.completed / result.count) * 100).toFixed(2) : 0
        };
      });
      
      return sourceMetrics;
      
    } catch (error) {
      console.error('Error getting jobs by source:', error);
      return {};
    }
  }

  /**
   * Get jobs by priority
   * @private
   */
  async getJobsByPriority() {
    try {
      const pipeline = [
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
            avgProcessingTime: { $avg: '$performance.totalTime' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];
      
      const results = await EmbeddingJob.aggregate(pipeline);
      
      const priorityMetrics = {};
      results.forEach(result => {
        priorityMetrics[result._id] = {
          count: result.count,
          averageProcessingTime: Math.round(result.avgProcessingTime || 0)
        };
      });
      
      return priorityMetrics;
      
    } catch (error) {
      console.error('Error getting jobs by priority:', error);
      return {};
    }
  }

  /**
   * Get average processing time
   * @private
   */
  async getAverageProcessingTime(since) {
    try {
      const pipeline = [
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: since },
            'performance.totalTime': { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$performance.totalTime' }
          }
        }
      ];
      
      const result = await EmbeddingJob.aggregate(pipeline);
      return result.length > 0 ? Math.round(result[0].avgTime) : 0;
      
    } catch (error) {
      console.error('Error getting average processing time:', error);
      return 0;
    }
  }

  /**
   * Get average response time
   * @private
   */
  async getAverageResponseTime(since) {
    try {
      const stats = await EmbeddingStats.findOne({
        timestamp: { $gte: since }
      }).sort({ timestamp: -1 });
      
      return stats ? stats.processing.averageResponseTime : 0;
      
    } catch (error) {
      console.error('Error getting average response time:', error);
      return 0;
    }
  }

  /**
   * Get throughput metrics
   * @private
   */
  async getThroughput(since) {
    try {
      const completedJobs = await EmbeddingJob.countDocuments({
        status: 'completed',
        completedAt: { $gte: since }
      });
      
      const hoursElapsed = (Date.now() - since.getTime()) / (1000 * 60 * 60);
      return hoursElapsed > 0 ? Math.round(completedJobs / hoursElapsed) : 0;
      
    } catch (error) {
      console.error('Error getting throughput:', error);
      return 0;
    }
  }

  /**
   * Get peak memory usage
   * @private
   */
  async getPeakMemoryUsage(since) {
    try {
      const stats = await EmbeddingStats.findOne({
        timestamp: { $gte: since }
      }).sort({ 'resourceUsage.memoryUsage': -1 });
      
      return stats ? stats.resourceUsage.memoryUsage : 0;
      
    } catch (error) {
      console.error('Error getting peak memory usage:', error);
      return 0;
    }
  }

  /**
   * Get error trends
   * @private
   */
  async getErrorTrends(since) {
    try {
      const pipeline = [
        {
          $match: {
            status: 'failed',
            failedAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$failedAt' },
              month: { $month: '$failedAt' },
              day: { $dayOfMonth: '$failedAt' },
              hour: { $hour: '$failedAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
      ];
      
      const results = await EmbeddingJob.aggregate(pipeline);
      
      return results.map(result => ({
        timestamp: new Date(result._id.year, result._id.month - 1, result._id.day, result._id.hour),
        errorCount: result.count
      }));
      
    } catch (error) {
      console.error('Error getting error trends:', error);
      return [];
    }
  }

  /**
   * Get processing trends
   * @private
   */
  async getProcessingTrends(since) {
    try {
      const pipeline = [
        {
          $match: {
            status: 'completed',
            completedAt: { $gte: since }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$completedAt' },
              month: { $month: '$completedAt' },
              day: { $dayOfMonth: '$completedAt' },
              hour: { $hour: '$completedAt' }
            },
            count: { $sum: 1 },
            avgTime: { $avg: '$performance.totalTime' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
        }
      ];
      
      const results = await EmbeddingJob.aggregate(pipeline);
      
      return results.map(result => ({
        timestamp: new Date(result._id.year, result._id.month - 1, result._id.day, result._id.hour),
        jobsCompleted: result.count,
        averageTime: Math.round(result.avgTime || 0)
      }));
      
    } catch (error) {
      console.error('Error getting processing trends:', error);
      return [];
    }
  }

  /**
   * Check database health
   * @private
   */
  async checkDatabaseHealth() {
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.db.admin().ping();
      
      const stats = await mongoose.connection.db.stats();
      
      return {
        healthy: true,
        responseTime: Date.now(),
        collections: stats.collections,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check API health
   * @private
   */
  async checkApiHealth() {
    try {
      // Basic API health check
      const startTime = Date.now();
      
      // Test basic operations
      await EmbeddingJob.findOne({}).limit(1);
      
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        responseTime,
        status: 'operational'
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check service health
   * @private
   */
  async checkServiceHealth() {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal);
      
      const healthy = memoryPercentage < this.alertThresholds.memoryUsage;
      
      return {
        healthy,
        memoryUsage: memoryPercentage,
        uptime: process.uptime(),
        status: healthy ? 'healthy' : 'degraded'
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get documents created today
   * @private
   */
  async getDocumentsToday() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return await VectorDocument.countDocuments({
        createdAt: { $gte: today }
      });
      
    } catch (error) {
      console.error('Error getting documents today:', error);
      return 0;
    }
  }

  /**
   * Get average embedding dimensions
   * @private
   */
  async getAverageEmbeddingDimensions() {
    try {
      const sample = await VectorDocument.findOne({
        embedding: { $exists: true }
      });
      
      return sample && sample.embedding ? sample.embedding.length : 0;
      
    } catch (error) {
      console.error('Error getting average embedding dimensions:', error);
      return 0;
    }
  }

  /**
   * Get storage size
   * @private
   */
  async getStorageSize() {
    try {
      const mongoose = require('mongoose');
      const stats = await mongoose.connection.db.collection('vectordocuments').stats();
      
      return {
        totalSize: stats.size || 0,
        storageSize: stats.storageSize || 0,
        avgObjSize: stats.avgObjSize || 0,
        count: stats.count || 0
      };
      
    } catch (error) {
      console.error('Error getting storage size:', error);
      return {
        totalSize: 0,
        storageSize: 0,
        avgObjSize: 0,
        count: 0
      };
    }
  }

  /**
   * Get index status
   * @private
   */
  async getIndexStatus() {
    try {
      const mongoose = require('mongoose');
      const indexes = await mongoose.connection.db.collection('vectordocuments').indexes();
      
      return {
        count: indexes.length,
        indexes: indexes.map(idx => ({
          name: idx.name,
          keys: idx.key,
          unique: idx.unique || false
        }))
      };
      
    } catch (error) {
      console.error('Error getting index status:', error);
      return { count: 0, indexes: [] };
    }
  }

  /**
   * Check for alerts
   * @private
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    try {
      // Error rate alert
      if (metrics.jobs.errorRate > this.alertThresholds.errorRate * 100) {
        alerts.push({
          type: 'error_rate',
          severity: 'warning',
          message: `High error rate: ${metrics.jobs.errorRate}%`,
          threshold: this.alertThresholds.errorRate * 100,
          current: metrics.jobs.errorRate,
          timestamp: new Date()
        });
      }
      
      // Queue length alert
      if (metrics.jobs.queued > this.alertThresholds.queueLength) {
        alerts.push({
          type: 'queue_length',
          severity: 'warning',
          message: `Queue length is high: ${metrics.jobs.queued} jobs`,
          threshold: this.alertThresholds.queueLength,
          current: metrics.jobs.queued,
          timestamp: new Date()
        });
      }
      
      // Memory usage alert
      const memoryPercentage = parseFloat(metrics.system.memory.percentage);
      if (memoryPercentage > this.alertThresholds.memoryUsage * 100) {
        alerts.push({
          type: 'memory_usage',
          severity: 'critical',
          message: `High memory usage: ${memoryPercentage}%`,
          threshold: this.alertThresholds.memoryUsage * 100,
          current: memoryPercentage,
          timestamp: new Date()
        });
      }
      
      // Response time alert
      if (metrics.performance.averageResponseTime > this.alertThresholds.responseTime) {
        alerts.push({
          type: 'response_time',
          severity: 'warning',
          message: `Slow response time: ${metrics.performance.averageResponseTime}ms`,
          threshold: this.alertThresholds.responseTime,
          current: metrics.performance.averageResponseTime,
          timestamp: new Date()
        });
      }
      
      // Health alerts
      if (metrics.health.overall !== 'healthy') {
        alerts.push({
          type: 'health_check',
          severity: 'critical',
          message: `System health is ${metrics.health.overall}`,
          timestamp: new Date()
        });
      }
      
      this.cache.alerts = alerts;
      
    } catch (error) {
      console.error('Error checking alerts:', error);
    }
  }

  /**
   * Get current metrics (from cache or fresh)
   */
  async getMetrics(forceRefresh = false) {
    if (forceRefresh || !this.cache.metrics || 
        (Date.now() - this.cache.lastUpdate.getTime() > this.refreshInterval)) {
      await this.updateMetrics();
    }
    
    return this.cache.metrics;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary() {
    const metrics = await this.getMetrics();
    
    if (!metrics) {
      return {
        status: 'unavailable',
        message: 'Metrics not available'
      };
    }
    
    return {
      status: metrics.health.overall,
      timestamp: metrics.timestamp,
      summary: {
        totalJobs: metrics.jobs.total,
        activeJobs: metrics.jobs.active,
        queuedJobs: metrics.jobs.queued,
        successRate: metrics.jobs.successRate,
        errorRate: metrics.jobs.errorRate,
        memoryUsage: metrics.system.memory.percentage,
        uptime: metrics.system.uptime,
        totalVectorDocuments: metrics.vectors.totalDocuments,
        alertCount: metrics.alerts.length
      },
      alerts: metrics.alerts.filter(alert => alert.severity === 'critical'),
      health: {
        database: metrics.health.database.healthy,
        api: metrics.health.api.healthy,
        services: metrics.health.services.healthy
      }
    };
  }

  /**
   * Get detailed metrics for a specific time range
   */
  async getMetricsRange(startDate, endDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            total: { $sum: 1 },
            avgProcessingTime: { $avg: '$performance.totalTime' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ];
      
      const results = await EmbeddingJob.aggregate(pipeline);
      
      return results.map(result => ({
        date: new Date(result._id.year, result._id.month - 1, result._id.day),
        completed: result.completed,
        failed: result.failed,
        total: result.total,
        successRate: result.total > 0 ? ((result.completed / result.total) * 100).toFixed(2) : 0,
        averageProcessingTime: Math.round(result.avgProcessingTime || 0)
      }));
      
    } catch (error) {
      console.error('Error getting metrics range:', error);
      return [];
    }
  }

  /**
   * Clear old metrics and alerts
   */
  async cleanup() {
    try {
      const cutoffDate = new Date(Date.now() - this.retentionPeriod);
      
      // Clean up old embedding stats
      const result = await EmbeddingStats.deleteMany({
        timestamp: { $lt: cutoffDate }
      });
      
      console.log(`Cleaned up ${result.deletedCount} old metrics records`);
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = MonitoringDashboardService; 