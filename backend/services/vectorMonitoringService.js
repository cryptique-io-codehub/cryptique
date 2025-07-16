const EventEmitter = require('events');
const { vectorDatabase } = require('../config/vectorDatabase');
const logger = require('../config/logger');

/**
 * Vector Database Monitoring Service
 * 
 * Provides comprehensive monitoring, alerting, and performance tracking
 * for vector database operations in CQ Intelligence.
 */

class VectorMonitoringService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      // Monitoring intervals
      metricsInterval: options.metricsInterval || 30000, // 30 seconds
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      performanceInterval: options.performanceInterval || 300000, // 5 minutes
      
      // Alert thresholds
      thresholds: {
        queryLatency: options.queryLatencyThreshold || 5000, // 5 seconds
        errorRate: options.errorRateThreshold || 0.05, // 5%
        diskUsage: options.diskUsageThreshold || 0.8, // 80%
        connectionPool: options.connectionPoolThreshold || 0.9, // 90%
        memoryUsage: options.memoryUsageThreshold || 0.85, // 85%
        cacheHitRate: options.cacheHitRateThreshold || 0.7, // 70%
        indexEfficiency: options.indexEfficiencyThreshold || 0.8 // 80%
      },
      
      // Alert configuration
      alerting: {
        enabled: options.alertingEnabled !== false,
        cooldownPeriod: options.alertCooldown || 300000, // 5 minutes
        maxAlertsPerHour: options.maxAlertsPerHour || 10,
        webhookUrl: options.webhookUrl || process.env.ALERT_WEBHOOK,
        emailRecipients: options.emailRecipients || []
      },
      
      // Metrics retention
      retention: {
        realTime: options.realTimeRetention || 3600000, // 1 hour
        historical: options.historicalRetention || 2592000000, // 30 days
        maxDataPoints: options.maxDataPoints || 1000
      }
    };
    
    // Monitoring state
    this.isMonitoring = false;
    this.intervals = {};
    this.metrics = {
      realTime: new Map(),
      historical: new Map(),
      alerts: new Map()
    };
    
    // Performance tracking
    this.performanceBaseline = {
      queryLatency: {
        p50: 0,
        p95: 0,
        p99: 0
      },
      throughput: {
        queriesPerSecond: 0,
        insertsPerSecond: 0
      },
      errorRates: {
        query: 0,
        insert: 0,
        connection: 0
      }
    };
    
    // Alert state
    this.alertState = {
      lastAlertTime: new Map(),
      alertCount: new Map(),
      suppressedAlerts: new Set()
    };
    
    // Initialize monitoring
    this.initializeMonitoring();
  }
  
  /**
   * Start monitoring services
   */
  async start() {
    if (this.isMonitoring) {
      this.log('warn', 'Monitoring already started');
      return;
    }
    
    try {
      // Start metric collection
      this.intervals.metrics = setInterval(
        () => this.collectMetrics(),
        this.config.metricsInterval
      );
      
      // Start health checks
      this.intervals.health = setInterval(
        () => this.performHealthCheck(),
        this.config.healthCheckInterval
      );
      
      // Start performance analysis
      this.intervals.performance = setInterval(
        () => this.analyzePerformance(),
        this.config.performanceInterval
      );
      
      // Start cleanup tasks
      this.intervals.cleanup = setInterval(
        () => this.cleanupMetrics(),
        this.config.retention.realTime
      );
      
      this.isMonitoring = true;
      this.log('info', 'Vector database monitoring started');
      this.emit('monitoringStarted');
      
    } catch (error) {
      this.log('error', 'Failed to start monitoring', error);
      throw error;
    }
  }
  
  /**
   * Stop monitoring services
   */
  async stop() {
    if (!this.isMonitoring) {
      return;
    }
    
    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });
    
    this.intervals = {};
    this.isMonitoring = false;
    
    this.log('info', 'Vector database monitoring stopped');
    this.emit('monitoringStopped');
  }
  
  /**
   * Collect real-time metrics
   */
  async collectMetrics() {
    try {
      const timestamp = Date.now();
      
      // Get database statistics
      const dbStats = await vectorDatabase.getStats();
      
      // Get system metrics
      const systemMetrics = this.getSystemMetrics();
      
      // Get performance metrics
      const performanceMetrics = this.getPerformanceMetrics();
      
      // Combine all metrics
      const metrics = {
        timestamp,
        database: dbStats,
        system: systemMetrics,
        performance: performanceMetrics,
        health: await vectorDatabase.healthCheck()
      };
      
      // Store metrics
      this.storeMetrics(metrics);
      
      // Check for alerts
      await this.checkAlerts(metrics);
      
      this.emit('metricsCollected', metrics);
      
    } catch (error) {
      this.log('error', 'Failed to collect metrics', error);
      this.emit('metricsError', error);
    }
  }
  
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const healthResult = await vectorDatabase.healthCheck();
      
      // Enhanced health check
      const enhancedHealth = {
        ...healthResult,
        timestamp: Date.now(),
        checks: {
          connectivity: healthResult.connected,
          vectorIndex: healthResult.vectorIndexExists,
          circuitBreaker: healthResult.circuitBreakerState === 'closed',
          responseTime: healthResult.responseTime < this.config.thresholds.queryLatency,
          errorRate: this.calculateErrorRate() < this.config.thresholds.errorRate
        }
      };
      
      // Calculate overall health score
      const healthScore = this.calculateHealthScore(enhancedHealth.checks);
      enhancedHealth.healthScore = healthScore;
      enhancedHealth.status = healthScore > 0.8 ? 'healthy' : healthScore > 0.5 ? 'degraded' : 'unhealthy';
      
      this.emit('healthCheck', enhancedHealth);
      
      // Alert on health issues
      if (enhancedHealth.status !== 'healthy') {
        await this.sendAlert('health_check_failed', {
          status: enhancedHealth.status,
          score: healthScore,
          issues: Object.entries(enhancedHealth.checks)
            .filter(([key, value]) => !value)
            .map(([key]) => key)
        });
      }
      
      return enhancedHealth;
      
    } catch (error) {
      this.log('error', 'Health check failed', error);
      
      await this.sendAlert('health_check_error', {
        error: error.message,
        timestamp: Date.now()
      });
      
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * Analyze performance trends
   */
  async analyzePerformance() {
    try {
      const recentMetrics = this.getRecentMetrics(this.config.performanceInterval);
      
      if (recentMetrics.length === 0) {
        return;
      }
      
      // Calculate performance statistics
      const analysis = {
        timestamp: Date.now(),
        period: this.config.performanceInterval,
        queryLatency: this.calculateLatencyStats(recentMetrics),
        throughput: this.calculateThroughputStats(recentMetrics),
        errorRates: this.calculateErrorRateStats(recentMetrics),
        resourceUsage: this.calculateResourceUsageStats(recentMetrics),
        trends: this.calculateTrends(recentMetrics)
      };
      
      // Update baseline
      this.updatePerformanceBaseline(analysis);
      
      // Check for performance degradation
      await this.checkPerformanceAlerts(analysis);
      
      this.emit('performanceAnalysis', analysis);
      
      return analysis;
      
    } catch (error) {
      this.log('error', 'Performance analysis failed', error);
      this.emit('performanceAnalysisError', error);
    }
  }
  
  /**
   * Check for alert conditions
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    // Query latency alert
    if (metrics.performance.averageQueryTime > this.config.thresholds.queryLatency) {
      alerts.push({
        type: 'query_latency',
        severity: 'warning',
        message: `Query latency exceeded threshold: ${metrics.performance.averageQueryTime}ms`,
        value: metrics.performance.averageQueryTime,
        threshold: this.config.thresholds.queryLatency
      });
    }
    
    // Error rate alert
    const errorRate = this.calculateErrorRate();
    if (errorRate > this.config.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'critical',
        message: `Error rate exceeded threshold: ${(errorRate * 100).toFixed(2)}%`,
        value: errorRate,
        threshold: this.config.thresholds.errorRate
      });
    }
    
    // Connection pool alert
    const connectionUsage = this.calculateConnectionUsage();
    if (connectionUsage > this.config.thresholds.connectionPool) {
      alerts.push({
        type: 'connection_pool',
        severity: 'warning',
        message: `Connection pool usage exceeded threshold: ${(connectionUsage * 100).toFixed(2)}%`,
        value: connectionUsage,
        threshold: this.config.thresholds.connectionPool
      });
    }
    
    // Memory usage alert
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > this.config.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'critical',
        message: `Memory usage exceeded threshold: ${(memoryUsage * 100).toFixed(2)}%`,
        value: memoryUsage,
        threshold: this.config.thresholds.memoryUsage
      });
    }
    
    // Cache hit rate alert
    const cacheHitRate = this.calculateCacheHitRate();
    if (cacheHitRate < this.config.thresholds.cacheHitRate) {
      alerts.push({
        type: 'cache_hit_rate',
        severity: 'warning',
        message: `Cache hit rate below threshold: ${(cacheHitRate * 100).toFixed(2)}%`,
        value: cacheHitRate,
        threshold: this.config.thresholds.cacheHitRate
      });
    }
    
    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert.type, alert);
    }
  }
  
  /**
   * Send alert notification
   */
  async sendAlert(type, details) {
    if (!this.config.alerting.enabled) {
      return;
    }
    
    // Check cooldown period
    const lastAlert = this.alertState.lastAlertTime.get(type);
    if (lastAlert && Date.now() - lastAlert < this.config.alerting.cooldownPeriod) {
      return;
    }
    
    // Check rate limiting
    const hourlyCount = this.getHourlyAlertCount();
    if (hourlyCount >= this.config.alerting.maxAlertsPerHour) {
      this.alertState.suppressedAlerts.add(type);
      return;
    }
    
    try {
      const alert = {
        id: `${type}_${Date.now()}`,
        type,
        timestamp: Date.now(),
        severity: details.severity || 'warning',
        message: details.message || `Alert: ${type}`,
        details,
        source: 'vector-monitoring'
      };
      
      // Store alert
      this.storeAlert(alert);
      
      // Send webhook notification
      if (this.config.alerting.webhookUrl) {
        await this.sendWebhookAlert(alert);
      }
      
      // Send email notification
      if (this.config.alerting.emailRecipients.length > 0) {
        await this.sendEmailAlert(alert);
      }
      
      // Update alert state
      this.alertState.lastAlertTime.set(type, Date.now());
      this.incrementAlertCount(type);
      
      this.emit('alertSent', alert);
      this.log('warn', `Alert sent: ${type}`, alert);
      
    } catch (error) {
      this.log('error', 'Failed to send alert', error);
      this.emit('alertError', { type, error });
    }
  }
  
  /**
   * Get current monitoring dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const recentMetrics = this.getRecentMetrics(3600000); // Last hour
    
    return {
      timestamp: now,
      status: this.isMonitoring ? 'active' : 'inactive',
      overview: {
        totalQueries: this.getTotalQueries(),
        averageLatency: this.getAverageLatency(),
        errorRate: this.calculateErrorRate(),
        uptime: this.getUptime(),
        healthScore: this.calculateOverallHealthScore()
      },
      realTimeMetrics: this.getLatestMetrics(),
      performance: {
        queryLatency: this.getLatencyTrend(recentMetrics),
        throughput: this.getThroughputTrend(recentMetrics),
        errorRate: this.getErrorRateTrend(recentMetrics)
      },
      alerts: {
        active: this.getActiveAlerts(),
        recent: this.getRecentAlerts(24 * 3600000), // Last 24 hours
        suppressed: Array.from(this.alertState.suppressedAlerts)
      },
      system: {
        memoryUsage: this.getMemoryUsage(),
        connectionPool: this.calculateConnectionUsage(),
        cacheHitRate: this.calculateCacheHitRate(),
        diskUsage: this.getDiskUsage()
      }
    };
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport(timeRange = 24 * 3600000) { // 24 hours
    const metrics = this.getMetricsInRange(timeRange);
    
    return {
      timeRange,
      summary: {
        totalQueries: metrics.reduce((sum, m) => sum + (m.performance?.totalQueries || 0), 0),
        averageLatency: this.calculateAverageLatency(metrics),
        peakLatency: this.calculatePeakLatency(metrics),
        errorRate: this.calculateAverageErrorRate(metrics),
        uptime: this.calculateUptime(metrics)
      },
      trends: {
        latency: this.calculateLatencyTrend(metrics),
        throughput: this.calculateThroughputTrend(metrics),
        errors: this.calculateErrorTrend(metrics)
      },
      topIssues: this.identifyTopIssues(metrics),
      recommendations: this.generateRecommendations(metrics)
    };
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Initialize monitoring setup
   */
  initializeMonitoring() {
    // Listen to vector database events
    vectorDatabase.on('metricsCollected', (metrics) => {
      this.handleVectorMetrics(metrics);
    });
    
    vectorDatabase.on('queryError', (error) => {
      this.handleQueryError(error);
    });
    
    vectorDatabase.on('connectionError', (error) => {
      this.handleConnectionError(error);
    });
    
    this.log('info', 'Vector monitoring service initialized');
  }
  
  /**
   * Store metrics in memory with retention
   */
  storeMetrics(metrics) {
    const timestamp = metrics.timestamp;
    
    // Store in real-time metrics
    this.metrics.realTime.set(timestamp, metrics);
    
    // Store in historical metrics (downsampled)
    if (timestamp % 300000 === 0) { // Every 5 minutes
      this.metrics.historical.set(timestamp, metrics);
    }
    
    // Cleanup old metrics
    this.cleanupOldMetrics();
  }
  
  /**
   * Store alert information
   */
  storeAlert(alert) {
    this.metrics.alerts.set(alert.id, alert);
    
    // Cleanup old alerts
    const cutoff = Date.now() - (7 * 24 * 3600000); // 7 days
    for (const [id, storedAlert] of this.metrics.alerts.entries()) {
      if (storedAlert.timestamp < cutoff) {
        this.metrics.alerts.delete(id);
      }
    }
  }
  
  /**
   * Get system metrics
   */
  getSystemMetrics() {
    const process = require('process');
    const os = require('os');
    
    return {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        rss: process.memoryUsage().rss
      },
      cpu: {
        usage: process.cpuUsage(),
        loadAverage: os.loadavg()
      },
      uptime: process.uptime(),
      nodeVersion: process.version
    };
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const dbMetrics = vectorDatabase.metrics;
    
    return {
      totalQueries: dbMetrics.totalQueries,
      successfulQueries: dbMetrics.successfulQueries,
      failedQueries: dbMetrics.failedQueries,
      averageQueryTime: dbMetrics.averageQueryTime,
      lastQueryTime: dbMetrics.lastQueryTime,
      circuitBreakerState: vectorDatabase.circuitBreakerState,
      cacheSize: vectorDatabase.queryCache?.size || 0
    };
  }
  
  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    const dbMetrics = vectorDatabase.metrics;
    if (dbMetrics.totalQueries === 0) return 0;
    return dbMetrics.failedQueries / dbMetrics.totalQueries;
  }
  
  /**
   * Calculate connection usage
   */
  calculateConnectionUsage() {
    // This would need to be implemented based on actual connection pool metrics
    return 0.5; // Placeholder
  }
  
  /**
   * Get memory usage percentage
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return usage.heapUsed / usage.heapTotal;
  }
  
  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    // This would need to be implemented based on actual cache metrics
    return 0.8; // Placeholder
  }
  
  /**
   * Calculate health score
   */
  calculateHealthScore(checks) {
    const totalChecks = Object.keys(checks).length;
    const passedChecks = Object.values(checks).filter(Boolean).length;
    return totalChecks > 0 ? passedChecks / totalChecks : 0;
  }
  
  /**
   * Get recent metrics
   */
  getRecentMetrics(timeRange) {
    const cutoff = Date.now() - timeRange;
    const metrics = [];
    
    for (const [timestamp, metric] of this.metrics.realTime.entries()) {
      if (timestamp >= cutoff) {
        metrics.push(metric);
      }
    }
    
    return metrics.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Get latest metrics
   */
  getLatestMetrics() {
    const timestamps = Array.from(this.metrics.realTime.keys()).sort((a, b) => b - a);
    return timestamps.length > 0 ? this.metrics.realTime.get(timestamps[0]) : null;
  }
  
  /**
   * Calculate latency statistics
   */
  calculateLatencyStats(metrics) {
    const latencies = metrics.map(m => m.performance?.averageQueryTime || 0).filter(l => l > 0);
    
    if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };
    
    latencies.sort((a, b) => a - b);
    
    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)],
      avg: latencies.reduce((sum, l) => sum + l, 0) / latencies.length
    };
  }
  
  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    if (!this.config.alerting.webhookUrl) return;
    
    try {
      const axios = require('axios');
      
      await axios.post(this.config.alerting.webhookUrl, {
        text: `🚨 Vector Database Alert: ${alert.message}`,
        alert,
        timestamp: new Date(alert.timestamp).toISOString()
      }, {
        timeout: 5000
      });
      
    } catch (error) {
      this.log('error', 'Failed to send webhook alert', error);
    }
  }
  
  /**
   * Send email alert
   */
  async sendEmailAlert(alert) {
    // Email implementation would go here
    this.log('info', 'Email alert would be sent', alert);
  }
  
  /**
   * Cleanup old metrics
   */
  cleanupOldMetrics() {
    const realTimeCutoff = Date.now() - this.config.retention.realTime;
    const historicalCutoff = Date.now() - this.config.retention.historical;
    
    // Cleanup real-time metrics
    for (const timestamp of this.metrics.realTime.keys()) {
      if (timestamp < realTimeCutoff) {
        this.metrics.realTime.delete(timestamp);
      }
    }
    
    // Cleanup historical metrics
    for (const timestamp of this.metrics.historical.keys()) {
      if (timestamp < historicalCutoff) {
        this.metrics.historical.delete(timestamp);
      }
    }
  }
  
  /**
   * Cleanup expired metrics
   */
  cleanupMetrics() {
    this.cleanupOldMetrics();
    
    // Reset hourly alert counts
    const hourAgo = Date.now() - 3600000;
    for (const [type, count] of this.alertState.alertCount.entries()) {
      if (count.timestamp < hourAgo) {
        this.alertState.alertCount.delete(type);
      }
    }
  }
  
  /**
   * Get hourly alert count
   */
  getHourlyAlertCount() {
    const hourAgo = Date.now() - 3600000;
    let count = 0;
    
    for (const alert of this.metrics.alerts.values()) {
      if (alert.timestamp >= hourAgo) {
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Increment alert count
   */
  incrementAlertCount(type) {
    const current = this.alertState.alertCount.get(type) || { count: 0, timestamp: Date.now() };
    current.count++;
    this.alertState.alertCount.set(type, current);
  }
  
  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const activeAlerts = [];
    const fiveMinutesAgo = Date.now() - 300000;
    
    for (const alert of this.metrics.alerts.values()) {
      if (alert.timestamp >= fiveMinutesAgo && alert.severity === 'critical') {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts;
  }
  
  /**
   * Get recent alerts
   */
  getRecentAlerts(timeRange) {
    const cutoff = Date.now() - timeRange;
    const recentAlerts = [];
    
    for (const alert of this.metrics.alerts.values()) {
      if (alert.timestamp >= cutoff) {
        recentAlerts.push(alert);
      }
    }
    
    return recentAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  /**
   * Handle vector database metrics
   */
  handleVectorMetrics(metrics) {
    // Process and store vector-specific metrics
    this.emit('vectorMetrics', metrics);
  }
  
  /**
   * Handle query errors
   */
  handleQueryError(error) {
    this.log('error', 'Query error detected', error);
    this.emit('queryError', error);
  }
  
  /**
   * Handle connection errors
   */
  handleConnectionError(error) {
    this.log('error', 'Connection error detected', error);
    this.emit('connectionError', error);
  }
  
  /**
   * Log messages
   */
  log(level, message, extra = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: 'VectorMonitoring',
      message,
      ...(extra && { extra })
    };
    
    if (logger && logger[level]) {
      logger[level](message, extra);
    } else {
      console[level]?.(JSON.stringify(logEntry));
    }
    
    this.emit('log', logEntry);
  }
}

// Create singleton instance
const vectorMonitoringService = new VectorMonitoringService();

module.exports = {
  VectorMonitoringService,
  vectorMonitoringService
}; 