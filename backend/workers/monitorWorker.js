#!/usr/bin/env node

const cluster = require('cluster');
const logger = require('../config/logger');
const { connectToDatabase } = require('../config/database');
const MonitoringDashboardService = require('../services/monitoringDashboardService');

// Set process title
process.title = `cryptique-monitor-worker-${process.env.INSTANCE_ID || cluster.worker?.id || 'main'}`;

class MonitorWorker {
  constructor() {
    this.isShuttingDown = false;
    this.alertHistory = new Map();
    this.systemMetrics = {
      startTime: Date.now(),
      alertsSent: 0,
      checksPerformed: 0,
      lastHealthCheck: null,
      criticalAlerts: 0,
      warningAlerts: 0
    };
    
    // Initialize monitoring service
    this.monitoringService = new MonitoringDashboardService({
      refreshInterval: parseInt(process.env.MONITOR_REFRESH_INTERVAL) || 5000,
      retentionPeriod: parseInt(process.env.MONITOR_RETENTION_PERIOD) || 7 * 24 * 60 * 60 * 1000,
      alertThresholds: {
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.1,
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 5000,
        queueLength: parseInt(process.env.ALERT_QUEUE_LENGTH) || 100,
        memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE) || 0.8
      }
    });
    
    logger.info('Monitor Worker initialized', {
      workerId: process.env.INSTANCE_ID || cluster.worker?.id,
      pid: process.pid,
      nodeEnv: process.env.NODE_ENV
    });
  }

  /**
   * Start the monitor worker
   */
  async start() {
    try {
      logger.info('Starting Monitor Worker...', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid
      });
      
      // Connect to database
      await connectToDatabase();
      logger.info('Database connected successfully');
      
      // Start monitoring service
      this.monitoringService.start();
      
      // Start alert processing
      this.startAlertProcessing();
      
      // Start system health monitoring
      this.startSystemHealthMonitoring();
      
      // Start performance reporting
      this.startPerformanceReporting();
      
      // Signal that worker is ready
      if (process.send) {
        process.send('ready');
      }
      
      logger.info('Monitor Worker started successfully', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid,
        uptime: Date.now() - this.systemMetrics.startTime
      });
      
    } catch (error) {
      logger.error('Failed to start Monitor Worker', {
        error: error.message,
        stack: error.stack,
        workerId: process.env.INSTANCE_ID
      });
      process.exit(1);
    }
  }

  /**
   * Start alert processing
   */
  startAlertProcessing() {
    setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        const metrics = await this.monitoringService.getMetrics();
        if (!metrics || !metrics.alerts) return;
        
        // Process each alert
        for (const alert of metrics.alerts) {
          await this.processAlert(alert);
        }
        
        this.systemMetrics.checksPerformed++;
        this.systemMetrics.lastHealthCheck = new Date();
        
      } catch (error) {
        logger.error('Error processing alerts', {
          error: error.message,
          workerId: process.env.INSTANCE_ID
        });
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Process individual alert
   */
  async processAlert(alert) {
    const alertKey = `${alert.type}_${alert.severity}`;
    const now = Date.now();
    
    // Check if we've already sent this alert recently (prevent spam)
    const lastSent = this.alertHistory.get(alertKey);
    const cooldownPeriod = alert.severity === 'critical' ? 300000 : 900000; // 5min for critical, 15min for others
    
    if (lastSent && (now - lastSent) < cooldownPeriod) {
      return; // Skip duplicate alert
    }
    
    // Log the alert
    const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
    logger[logLevel]('System alert triggered', {
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      threshold: alert.threshold,
      current: alert.current,
      timestamp: alert.timestamp,
      workerId: process.env.INSTANCE_ID
    });
    
    // Update alert history
    this.alertHistory.set(alertKey, now);
    this.systemMetrics.alertsSent++;
    
    if (alert.severity === 'critical') {
      this.systemMetrics.criticalAlerts++;
      
      // Send critical alert notifications
      await this.sendCriticalAlert(alert);
      
    } else if (alert.severity === 'warning') {
      this.systemMetrics.warningAlerts++;
    }
    
    // Clean up old alert history
    this.cleanupAlertHistory();
  }

  /**
   * Send critical alert notifications
   */
  async sendCriticalAlert(alert) {
    try {
      // Log critical alert with special formatting
      logger.error('🚨 CRITICAL ALERT 🚨', {
        type: alert.type.toUpperCase(),
        message: alert.message,
        current: alert.current,
        threshold: alert.threshold,
        timestamp: alert.timestamp,
        workerId: process.env.INSTANCE_ID,
        urgent: true
      });
      
      // Here you could integrate with external alerting systems:
      // - Slack notifications
      // - Email alerts
      // - PagerDuty
      // - Discord webhooks
      // - SMS notifications
      
      // Example webhook notification (if configured)
      if (process.env.ALERT_WEBHOOK_URL) {
        await this.sendWebhookAlert(alert);
      }
      
    } catch (error) {
      logger.error('Failed to send critical alert', {
        error: error.message,
        alert: alert,
        workerId: process.env.INSTANCE_ID
      });
    }
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const fetch = require('node-fetch');
      
      const payload = {
        text: `🚨 Cryptique RAG System Alert`,
        attachments: [{
          color: alert.severity === 'critical' ? 'danger' : 'warning',
          fields: [
            {
              title: 'Alert Type',
              value: alert.type,
              short: true
            },
            {
              title: 'Severity',
              value: alert.severity.toUpperCase(),
              short: true
            },
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Current Value',
              value: alert.current,
              short: true
            },
            {
              title: 'Threshold',
              value: alert.threshold,
              short: true
            },
            {
              title: 'Worker ID',
              value: process.env.INSTANCE_ID || 'unknown',
              short: true
            },
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true
            }
          ]
        }]
      };
      
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      logger.info('Webhook alert sent successfully', {
        alertType: alert.type,
        severity: alert.severity
      });
      
    } catch (error) {
      logger.error('Failed to send webhook alert', {
        error: error.message,
        webhookUrl: process.env.ALERT_WEBHOOK_URL
      });
    }
  }

  /**
   * Clean up old alert history
   */
  cleanupAlertHistory() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (now - timestamp > maxAge) {
        this.alertHistory.delete(key);
      }
    }
  }

  /**
   * Start system health monitoring
   */
  startSystemHealthMonitoring() {
    setInterval(async () => {
      if (this.isShuttingDown) return;
      
      try {
        const summary = await this.monitoringService.getDashboardSummary();
        
        logger.logPerformance('System health summary', {
          status: summary.status,
          summary: summary.summary,
          health: summary.health,
          alertCount: summary.alerts?.length || 0,
          workerId: process.env.INSTANCE_ID
        });
        
        // Check for system degradation
        if (summary.status === 'degraded' || summary.status === 'unhealthy') {
          logger.warn('System health degraded', {
            status: summary.status,
            issues: summary.alerts,
            workerId: process.env.INSTANCE_ID
          });
        }
        
      } catch (error) {
        logger.error('Error monitoring system health', {
          error: error.message,
          workerId: process.env.INSTANCE_ID
        });
      }
    }, 60000); // Every minute
  }

  /**
   * Start performance reporting
   */
  startPerformanceReporting() {
    setInterval(() => {
      if (this.isShuttingDown) return;
      
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
      
      logger.logPerformance('Monitor worker performance', {
        workerId: process.env.INSTANCE_ID,
        pid: process.pid,
        uptime: Date.now() - this.systemMetrics.startTime,
        memoryUsageMB: memoryMB,
        metrics: this.systemMetrics,
        alertHistorySize: this.alertHistory.size
      });
      
    }, 300000); // Every 5 minutes
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    logger.info('Monitor Worker shutting down...', {
      workerId: process.env.INSTANCE_ID,
      totalAlertsSent: this.systemMetrics.alertsSent,
      totalChecks: this.systemMetrics.checksPerformed
    });
    
    try {
      // Stop monitoring service
      if (this.monitoringService) {
        this.monitoringService.stop();
      }
      
      // Final performance report
      logger.logPerformance('Monitor worker final report', {
        workerId: process.env.INSTANCE_ID,
        uptime: Date.now() - this.systemMetrics.startTime,
        totalAlertsSent: this.systemMetrics.alertsSent,
        totalChecks: this.systemMetrics.checksPerformed,
        criticalAlerts: this.systemMetrics.criticalAlerts,
        warningAlerts: this.systemMetrics.warningAlerts
      });
      
      logger.info('Monitor Worker shutdown completed', {
        workerId: process.env.INSTANCE_ID
      });
      
      process.exit(0);
      
    } catch (error) {
      logger.error('Error during Monitor Worker shutdown', {
        error: error.message,
        workerId: process.env.INSTANCE_ID
      });
      process.exit(1);
    }
  }
}

// Initialize and start worker
const worker = new MonitorWorker();

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
  logger.error('Uncaught exception in Monitor Worker', {
    error: error.message,
    stack: error.stack,
    workerId: process.env.INSTANCE_ID
  });
  worker.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in Monitor Worker', {
    reason: reason,
    promise: promise,
    workerId: process.env.INSTANCE_ID
  });
  worker.shutdown();
});

// Start the worker
worker.start().catch((error) => {
  logger.error('Failed to start Monitor Worker', {
    error: error.message,
    stack: error.stack
  });
  process.exit(1);
}); 