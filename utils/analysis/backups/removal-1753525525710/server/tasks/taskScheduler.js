/**
 * Distributed Task Scheduler for Data Retention
 * 
 * This module provides a way to schedule and distribute data retention tasks
 * across multiple instances of the application. It can use Redis for coordination
 * in a distributed environment, or fall back to a local implementation for development.
 */

const Redis = require('ioredis');
const { randomUUID } = require('crypto');
const os = require('os');
const dataRetentionService = require('../services/dataRetentionService');
const { performance } = require('perf_hooks');

// Task types
const TASK_TYPES = {
  MARK_EXPIRED_DATA: 'mark_expired_data',
  DELETE_EXPIRED_DATA: 'delete_expired_data'
};

class TaskScheduler {
  /**
   * Create a new task scheduler
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    const {
      redis = null,           // Redis connection string or instance
      keyPrefix = 'tasks:',   // Redis key prefix
      lockTimeout = 60000,    // Lock timeout in milliseconds (60 seconds)
      retryDelay = 5000,      // Retry delay in milliseconds (5 seconds)
      maxRetries = 3,         // Maximum number of retries
      instanceId = `worker-${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`, // Unique instance ID
      distributed = !!redis   // Whether to use distributed mode (Redis)
    } = options;
    
    this.keyPrefix = keyPrefix;
    this.lockTimeout = lockTimeout;
    this.retryDelay = retryDelay;
    this.maxRetries = maxRetries;
    this.instanceId = instanceId;
    this.distributed = distributed;
    this.redisClient = null;
    this.initialized = false;
    this.taskHandlers = {};
    this.activeJobs = new Map();
    this.metrics = {
      tasksScheduled: 0,
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0
    };
    
    // Register default task handlers
    this.registerTaskHandler(TASK_TYPES.MARK_EXPIRED_DATA, this.handleMarkExpiredData.bind(this));
    this.registerTaskHandler(TASK_TYPES.DELETE_EXPIRED_DATA, this.handleDeleteExpiredData.bind(this));
    
    // Initialize Redis if provided
    if (redis) {
      this.initRedis(redis);
    }
  }
  
  /**
   * Initialize Redis connection
   * @param {string|Object} redis - Redis connection string or instance
   */
  initRedis(redis) {
    try {
      // If redis is a string URL
      if (typeof redis === 'string') {
        this.redisClient = new Redis(redis);
      } 
      // If redis is already a Redis instance
      else if (redis instanceof Redis) {
        this.redisClient = redis;
      } else {
        throw new Error('Invalid Redis configuration');
      }
      
      this.redisClient.on('error', (error) => {
        console.error('Redis task scheduler error:', error);
      });
      
      this.redisClient.on('connect', () => {
        console.log('Task scheduler connected to Redis');
        this.initialized = true;
      });
      
      console.log('Task scheduler initialized in distributed mode with Redis');
    } catch (error) {
      console.error('Failed to initialize Redis for task scheduler:', error.message);
      console.log('Falling back to local mode');
      this.distributed = false;
      this.initialized = true;
    }
  }
  
  /**
   * Register a task handler
   * @param {string} taskType - Type of task
   * @param {Function} handler - Handler function
   */
  registerTaskHandler(taskType, handler) {
    this.taskHandlers[taskType] = handler;
  }
  
  /**
   * Schedule a task for execution
   * @param {string} taskType - Type of task
   * @param {Object} taskData - Task data
   * @param {Object} options - Scheduling options
   * @returns {Promise<string>} - Task ID
   */
  async scheduleTask(taskType, taskData = {}, options = {}) {
    const {
      delay = 0,
      priority = 1,
      lockKey = taskType
    } = options;
    
    const taskId = randomUUID();
    const task = {
      id: taskId,
      type: taskType,
      data: taskData,
      priority,
      lockKey,
      createdAt: Date.now(),
      scheduledAt: Date.now() + delay,
      attempts: 0
    };
    
    try {
      if (this.distributed && this.redisClient) {
        // In distributed mode, add task to Redis
        const taskKey = `${this.keyPrefix}${taskId}`;
        await this.redisClient.set(taskKey, JSON.stringify(task));
        
        // If delay is specified, use Redis sorted set for scheduling
        if (delay > 0) {
          await this.redisClient.zadd(
            `${this.keyPrefix}scheduled`,
            task.scheduledAt,
            taskId
          );
        } else {
          // Otherwise, add to pending queue
          await this.redisClient.lpush(
            `${this.keyPrefix}pending:${priority}`,
            taskId
          );
        }
        
        console.log(`Task ${taskId} (${taskType}) scheduled in Redis`);
      } else {
        // In local mode, schedule with setTimeout
        console.log(`Task ${taskId} (${taskType}) scheduled locally`);
        setTimeout(() => this.executeTask(task), delay);
      }
      
      this.metrics.tasksScheduled++;
      return taskId;
    } catch (error) {
      console.error(`Error scheduling task ${taskType}:`, error);
      // Even if Redis fails, try to execute locally
      setTimeout(() => this.executeTask(task), delay);
      return taskId;
    }
  }
  
  /**
   * Execute a task
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(task) {
    const startTime = performance.now();
    console.log(`Executing task ${task.id} (${task.type})`);
    
    // Track active job
    this.activeJobs.set(task.id, {
      task,
      startTime,
      status: 'running'
    });
    
    try {
      // Get lock in distributed mode
      if (this.distributed && this.redisClient) {
        const lockKey = `${this.keyPrefix}lock:${task.lockKey}`;
        const locked = await this.redisClient.set(
          lockKey,
          this.instanceId,
          'NX',
          'PX',
          this.lockTimeout
        );
        
        if (!locked) {
          console.log(`Task ${task.id} (${task.type}) is locked, deferring execution`);
          
          // Defer execution
          setTimeout(() => this.scheduleTask(task.type, task.data, {
            lockKey: task.lockKey,
            priority: task.priority
          }), this.retryDelay);
          
          this.activeJobs.delete(task.id);
          return;
        }
      }
      
      // Find task handler
      const handler = this.taskHandlers[task.type];
      if (!handler) {
        throw new Error(`No handler registered for task type ${task.type}`);
      }
      
      // Execute task
      task.attempts++;
      const result = await handler(task.data);
      const duration = performance.now() - startTime;
      
      console.log(`Task ${task.id} (${task.type}) completed in ${duration.toFixed(2)}ms`);
      
      // Update metrics
      this.metrics.tasksExecuted++;
      this.metrics.tasksSucceeded++;
      
      // Release lock in distributed mode
      if (this.distributed && this.redisClient) {
        const lockKey = `${this.keyPrefix}lock:${task.lockKey}`;
        // Only release if we still own the lock
        const script = `
          if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
          else
            return 0
          end
        `;
        await this.redisClient.eval(script, 1, lockKey, this.instanceId);
        
        // Remove task from Redis
        await this.redisClient.del(`${this.keyPrefix}${task.id}`);
      }
      
      // Update job status
      const jobInfo = this.activeJobs.get(task.id);
      if (jobInfo) {
        jobInfo.status = 'completed';
        jobInfo.duration = duration;
        jobInfo.result = result;
        
        // Remove from active jobs after a delay
        setTimeout(() => {
          this.activeJobs.delete(task.id);
        }, 60000); // Keep completed job info for 1 minute
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`Task ${task.id} (${task.type}) failed after ${duration.toFixed(2)}ms:`, error);
      
      // Update metrics
      this.metrics.tasksExecuted++;
      this.metrics.tasksFailed++;
      
      // Update job status
      const jobInfo = this.activeJobs.get(task.id);
      if (jobInfo) {
        jobInfo.status = 'failed';
        jobInfo.duration = duration;
        jobInfo.error = error.message;
        
        // Remove from active jobs after a delay
        setTimeout(() => {
          this.activeJobs.delete(task.id);
        }, 60000); // Keep failed job info for 1 minute
      }
      
      // Release lock in distributed mode
      if (this.distributed && this.redisClient) {
        const lockKey = `${this.keyPrefix}lock:${task.lockKey}`;
        // Only release if we still own the lock
        const script = `
          if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
          else
            return 0
          end
        `;
        await this.redisClient.eval(script, 1, lockKey, this.instanceId);
      }
      
      // Retry if attempts are under max
      if (task.attempts < this.maxRetries) {
        console.log(`Retrying task ${task.id} (${task.type}), attempt ${task.attempts + 1}/${this.maxRetries}`);
        
        // Exponential backoff for retries
        const retryDelay = this.retryDelay * Math.pow(2, task.attempts - 1);
        
        setTimeout(() => this.scheduleTask(task.type, task.data, {
          lockKey: task.lockKey,
          priority: task.priority
        }), retryDelay);
      }
      
      throw error;
    }
  }
  
  /**
   * Start polling for tasks (in distributed mode)
   * @param {number} interval - Polling interval in milliseconds
   */
  startPolling(interval = 5000) {
    if (!this.distributed || !this.redisClient) {
      console.log('Polling only available in distributed mode');
      return;
    }
    
    console.log(`Starting task polling with interval ${interval}ms`);
    
    this.pollingInterval = setInterval(async () => {
      try {
        // Check for scheduled tasks that are due
        const now = Date.now();
        const dueTasks = await this.redisClient.zrangebyscore(
          `${this.keyPrefix}scheduled`,
          0,
          now
        );
        
        if (dueTasks.length > 0) {
          console.log(`Found ${dueTasks.length} scheduled tasks due for execution`);
          
          // Move due tasks to pending queue
          for (const taskId of dueTasks) {
            // Get task data
            const taskData = await this.redisClient.get(`${this.keyPrefix}${taskId}`);
            if (taskData) {
              const task = JSON.parse(taskData);
              
              // Add to pending queue
              await this.redisClient.lpush(
                `${this.keyPrefix}pending:${task.priority}`,
                taskId
              );
              
              // Remove from scheduled set
              await this.redisClient.zrem(
                `${this.keyPrefix}scheduled`,
                taskId
              );
            }
          }
        }
        
        // Check for pending tasks, starting with highest priority
        for (let priority = 3; priority >= 1; priority--) {
          const pendingKey = `${this.keyPrefix}pending:${priority}`;
          
          // Try to get a task
          const taskId = await this.redisClient.rpop(pendingKey);
          if (taskId) {
            // Get task data
            const taskData = await this.redisClient.get(`${this.keyPrefix}${taskId}`);
            if (taskData) {
              const task = JSON.parse(taskData);
              
              // Execute task
              this.executeTask(task).catch(error => {
                console.error(`Error executing polled task ${taskId}:`, error);
              });
              
              // Only process one task per polling interval to avoid overload
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error in task polling:', error);
      }
    }, interval);
  }
  
  /**
   * Stop polling for tasks
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Task polling stopped');
    }
  }
  
  /**
   * Handle mark expired data task
   * @param {Object} data - Task data
   * @returns {Promise<Object>} - Task result
   */
  async handleMarkExpiredData(data = {}) {
    console.log('Executing mark expired data task');
    return await dataRetentionService.markExpiredDataForDeletion();
  }
  
  /**
   * Handle delete expired data task
   * @param {Object} data - Task data
   * @returns {Promise<Object>} - Task result
   */
  async handleDeleteExpiredData(data = {}) {
    console.log('Executing delete expired data task');
    return await dataRetentionService.deleteExpiredData();
  }
  
  /**
   * Get task scheduler metrics
   * @returns {Object} - Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeJobs: this.activeJobs.size,
      distributed: this.distributed,
      instanceId: this.instanceId
    };
  }
  
  /**
   * Get active jobs
   * @returns {Array} - Active jobs
   */
  getActiveJobs() {
    return Array.from(this.activeJobs.entries()).map(([id, job]) => ({
      id,
      ...job
    }));
  }
  
  /**
   * Schedule mark expired data task
   * @returns {Promise<string>} - Task ID
   */
  async scheduleMarkExpiredData() {
    return this.scheduleTask(TASK_TYPES.MARK_EXPIRED_DATA, {}, {
      lockKey: 'mark_expired_data'
    });
  }
  
  /**
   * Schedule delete expired data task
   * @returns {Promise<string>} - Task ID
   */
  async scheduleDeleteExpiredData() {
    return this.scheduleTask(TASK_TYPES.DELETE_EXPIRED_DATA, {}, {
      lockKey: 'delete_expired_data',
      // Higher priority (2) for deletion tasks
      priority: 2
    });
  }
}

// Create singleton instance
const taskScheduler = new TaskScheduler({
  redis: process.env.REDIS_URL,
  distributed: process.env.ENABLE_DISTRIBUTED_TASKS === 'true'
});

module.exports = {
  taskScheduler,
  TaskScheduler,
  TASK_TYPES
}; 