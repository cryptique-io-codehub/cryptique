/**
 * Task Orchestrator Service
 * 
 * This service provides a dedicated microservice approach to task management:
 * - Separates task execution from the main application process
 * - Uses distributed locking to prevent duplicate task execution
 * - Implements prioritization and impact minimization strategies
 * - Provides health monitoring and failure recovery
 */

const { spawn } = require('child_process');
const path = require('path');
const Redis = require('ioredis');
const { randomUUID } = require('crypto');
const os = require('os');
const { performance } = require('perf_hooks');

// Task priorities
const PRIORITY = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3
};

// Task types
const TASK_TYPES = {
  MARK_EXPIRED_DATA: 'mark_expired_data',
  DELETE_EXPIRED_DATA: 'delete_expired_data',
  DATA_BACKUP: 'data_backup',
  DATA_RECOVERY: 'data_recovery',
  SYSTEM_CLEANUP: 'system_cleanup',
  HEALTH_CHECK: 'health_check'
};

// Resource impact levels
const IMPACT = {
  MINIMAL: 0,   // Negligible impact on system resources
  LOW: 1,       // Low impact, can run during normal operation
  MODERATE: 2,  // Moderate impact, preferably run during off-peak hours
  HIGH: 3,      // High impact, should be scheduled during maintenance windows
  CRITICAL: 4   // Critical impact, requires careful scheduling and monitoring
};

// Task executor modes
const EXECUTOR_MODE = {
  IN_PROCESS: 'in_process',    // Run in the same process (legacy mode)
  CHILD_PROCESS: 'child_process', // Run as a child process
  MICROSERVICE: 'microservice'  // Run as a separate microservice
};

class TaskOrchestrator {
  /**
   * Create a new task orchestrator
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    const {
      redis = process.env.REDIS_URL,
      namespace = 'tasks:orchestrator:',
      instanceId = `orchestrator-${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`,
      lockTimeout = 60000,  // Lock timeout in ms (60 seconds)
      executorMode = process.env.TASK_EXECUTOR_MODE || EXECUTOR_MODE.CHILD_PROCESS,
      taskScriptsDir = path.join(__dirname, '../tasks/executors'),
      maxConcurrentTasks = parseInt(process.env.MAX_CONCURRENT_TASKS || Math.max(1, Math.floor(os.cpus().length / 2)), 10),
      enableResourceControl = process.env.ENABLE_RESOURCE_CONTROL !== 'false'
    } = options;
    
    this.namespace = namespace;
    this.instanceId = instanceId;
    this.lockTimeout = lockTimeout;
    this.executorMode = executorMode;
    this.taskScriptsDir = taskScriptsDir;
    this.maxConcurrentTasks = maxConcurrentTasks;
    this.enableResourceControl = enableResourceControl;
    
    // Store active tasks
    this.activeTasks = new Map();
    
    // Resource control settings
    this.resourceControl = {
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80', 10),  // Pause if CPU > 80%
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '85', 10),  // Pause if Memory > 85%
      diskIOThreshold: parseInt(process.env.DISK_IO_THRESHOLD || '90', 10)  // Pause if Disk IO > 90%
    };
    
    // Metrics
    this.metrics = {
      tasksScheduled: 0,
      tasksStarted: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      locksAcquired: 0,
      locksReleased: 0,
      locksFailed: 0
    };
    
    // Initialize Redis
    this.initRedis(redis);
    
    // Task concurrency control
    this.runningTaskCount = 0;
    this.taskQueue = [];
    
    console.log(`Task orchestrator initialized with mode: ${this.executorMode}, max concurrent tasks: ${this.maxConcurrentTasks}`);
  }
  
  /**
   * Initialize Redis connection
   * @param {string|Object} redis - Redis connection string or instance
   */
  initRedis(redis) {
    try {
      if (!redis) {
        console.log('Redis not configured, operating in local mode only (no distributed locking)');
        this.redisClient = null;
        return;
      }
      
      // Create Redis client
      if (typeof redis === 'string') {
        this.redisClient = new Redis(redis);
      } else if (redis instanceof Redis) {
        this.redisClient = redis;
      } else {
        throw new Error('Invalid Redis configuration');
      }
      
      // Setup event handlers
      this.redisClient.on('error', (error) => {
        console.error('Redis task orchestrator error:', error);
      });
      
      this.redisClient.on('connect', () => {
        console.log('Task orchestrator connected to Redis');
      });
      
      console.log('Task orchestrator initialized with Redis for distributed locking');
    } catch (error) {
      console.error('Failed to initialize Redis for task orchestrator:', error.message);
      console.log('Falling back to local mode (no distributed locking)');
      this.redisClient = null;
    }
  }
  
  /**
   * Schedule a task for execution
   * @param {string} taskType - Type of task
   * @param {Object} taskData - Task data
   * @param {Object} options - Task options
   * @returns {Promise<Object>} - Task information
   */
  async scheduleTask(taskType, taskData = {}, options = {}) {
    const {
      priority = PRIORITY.NORMAL,
      impact = IMPACT.MODERATE,
      lockKey = taskType,
      delay = 0,
      timeout = 60 * 60 * 1000,  // Default 1 hour timeout
      executorMode = this.executorMode,
      retryLimit = 3,
      retryDelay = 5000
    } = options;
    
    // Generate task ID and create task object
    const taskId = randomUUID();
    const task = {
      id: taskId,
      type: taskType,
      data: taskData,
      options: {
        priority,
        impact,
        lockKey,
        timeout,
        executorMode,
        retryLimit,
        retryDelay
      },
      status: 'scheduled',
      createdAt: Date.now(),
      scheduledAt: Date.now() + delay,
      attempts: 0,
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };
    
    // Store task in Redis if available
    if (this.redisClient) {
      try {
        const taskKey = `${this.namespace}task:${taskId}`;
        await this.redisClient.set(taskKey, JSON.stringify(task));
        
        // Add to appropriate queue based on delay
        if (delay > 0) {
          await this.redisClient.zadd(
            `${this.namespace}scheduled`,
            task.scheduledAt,
            taskId
          );
        } else {
          // Use priority queue
          await this.redisClient.zadd(
            `${this.namespace}pending`,
            priority,
            taskId
          );
        }
        
        console.log(`Task ${taskId} (${taskType}) scheduled with priority ${priority} and impact ${impact}`);
      } catch (error) {
        console.error(`Error storing task ${taskId} in Redis:`, error);
        // Continue with local execution even if Redis fails
      }
    }
    
    // Increment metrics
    this.metrics.tasksScheduled++;
    
    // Queue task locally (with delay if specified)
    if (delay > 0) {
      setTimeout(() => this.queueTask(task), delay);
    } else {
      this.queueTask(task);
    }
    
    return {
      taskId,
      type: taskType,
      status: 'scheduled',
      scheduledAt: task.scheduledAt
    };
  }
  
  /**
   * Queue a task for execution
   * @param {Object} task - Task to queue
   */
  queueTask(task) {
    // Add to local queue
    this.taskQueue.push(task);
    
    // Sort queue by priority (higher first) and then by scheduled time (earlier first)
    this.taskQueue.sort((a, b) => {
      if (a.options.priority !== b.options.priority) {
        return b.options.priority - a.options.priority;
      }
      return a.scheduledAt - b.scheduledAt;
    });
    
    // Process queue
    this.processTaskQueue();
  }
  
  /**
   * Process the task queue
   */
  async processTaskQueue() {
    // Skip if we're at max concurrency
    if (this.runningTaskCount >= this.maxConcurrentTasks) {
      return;
    }
    
    // Check resource availability if enabled
    if (this.enableResourceControl && !await this.checkResourceAvailability()) {
      console.log('Resource limits reached, pausing task execution');
      return;
    }
    
    // Process tasks in order
    while (this.taskQueue.length > 0 && this.runningTaskCount < this.maxConcurrentTasks) {
      const task = this.taskQueue.shift();
      
      // Try to acquire lock
      const lockAcquired = await this.acquireLock(task.options.lockKey, task.id);
      
      if (lockAcquired) {
        // Execute task
        this.runningTaskCount++;
        this.executeTask(task).catch(error => {
          console.error(`Error executing task ${task.id}:`, error);
        });
      } else {
        // If lock failed, requeue with a delay
        setTimeout(() => this.queueTask(task), task.options.retryDelay);
        this.metrics.locksFailed++;
      }
    }
  }
  
  /**
   * Execute a task
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeTask(task) {
    const startTime = performance.now();
    console.log(`Starting task ${task.id} (${task.type}) with executor mode: ${task.options.executorMode}`);
    
    // Update task status
    task.status = 'running';
    task.startedAt = Date.now();
    task.attempts++;
    
    // Store task in active tasks
    this.activeTasks.set(task.id, task);
    this.metrics.tasksStarted++;
    
    try {
      // Execute task based on executor mode
      let result;
      
      switch (task.options.executorMode) {
        case EXECUTOR_MODE.IN_PROCESS:
          result = await this.executeInProcess(task);
          break;
          
        case EXECUTOR_MODE.CHILD_PROCESS:
          result = await this.executeAsChildProcess(task);
          break;
          
        case EXECUTOR_MODE.MICROSERVICE:
          result = await this.executeAsMicroservice(task);
          break;
          
        default:
          throw new Error(`Unknown executor mode: ${task.options.executorMode}`);
      }
      
      // Calculate duration
      const duration = performance.now() - startTime;
      
      // Update task with success result
      task.status = 'completed';
      task.completedAt = Date.now();
      task.duration = duration;
      task.result = result;
      
      console.log(`Task ${task.id} (${task.type}) completed in ${(duration / 1000).toFixed(2)}s`);
      this.metrics.tasksCompleted++;
      
      return result;
    } catch (error) {
      // Calculate duration
      const duration = performance.now() - startTime;
      
      // Update task with error
      task.status = 'failed';
      task.completedAt = Date.now();
      task.duration = duration;
      task.error = {
        message: error.message,
        stack: error.stack
      };
      
      console.error(`Task ${task.id} (${task.type}) failed after ${(duration / 1000).toFixed(2)}s:`, error);
      this.metrics.tasksFailed++;
      
      // Retry if attempts are under limit
      if (task.attempts < task.options.retryLimit) {
        console.log(`Will retry task ${task.id} (${task.type}), attempt ${task.attempts}/${task.options.retryLimit}`);
        
        // Exponential backoff
        const retryDelay = task.options.retryDelay * Math.pow(2, task.attempts - 1);
        
        // Reset task status and requeue
        task.status = 'scheduled';
        setTimeout(() => this.queueTask(task), retryDelay);
      }
      
      throw error;
    } finally {
      // Always release lock and decrement running count
      await this.releaseLock(task.options.lockKey, task.id);
      this.runningTaskCount--;
      
      // Store task result in Redis if available
      if (this.redisClient) {
        try {
          const taskKey = `${this.namespace}task:${task.id}`;
          await this.redisClient.set(taskKey, JSON.stringify(task));
          
          // Add to completed/failed set
          const resultSet = task.status === 'completed' 
            ? `${this.namespace}completed` 
            : `${this.namespace}failed`;
            
          await this.redisClient.zadd(resultSet, Date.now(), task.id);
          
          // Expire task data after 7 days
          await this.redisClient.expire(taskKey, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error(`Error storing task result for ${task.id} in Redis:`, error);
        }
      }
      
      // Process next task
      setTimeout(() => this.processTaskQueue(), 100);
    }
  }
  
  /**
   * Execute task in the current process
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeInProcess(task) {
    // Map task type to handler function
    const handlerMap = {
      [TASK_TYPES.MARK_EXPIRED_DATA]: require('../services/dataRetentionService').markExpiredDataForDeletion,
      [TASK_TYPES.DELETE_EXPIRED_DATA]: require('../services/dataRetentionService').deleteExpiredData,
      // Add other task handlers as needed
    };
    
    const handler = handlerMap[task.type];
    if (!handler) {
      throw new Error(`No in-process handler found for task type: ${task.type}`);
    }
    
    // Execute handler with task data
    return handler(task.data);
  }
  
  /**
   * Execute task as a child process
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeAsChildProcess(task) {
    return new Promise((resolve, reject) => {
      // Determine script path based on task type
      const scriptPath = path.join(this.taskScriptsDir, `${task.type}.js`);
      
      // Spawn child process
      const child = spawn('node', [scriptPath], {
        env: { 
          ...process.env,
          TASK_ID: task.id,
          TASK_DATA: JSON.stringify(task.data)
        },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc']
      });
      
      // Set timeout
      const timeoutId = setTimeout(() => {
        console.error(`Task ${task.id} timed out after ${task.options.timeout / 1000}s`);
        child.kill('SIGTERM');
        reject(new Error(`Task timed out after ${task.options.timeout / 1000}s`));
      }, task.options.timeout);
      
      // Collect output
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Handle message from child
      child.on('message', (message) => {
        if (message.type === 'result') {
          clearTimeout(timeoutId);
          resolve(message.data);
        }
      });
      
      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (code === 0) {
          // If no message was received, use stdout as result
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Child process failed with exit code ${code}: ${stderr}`));
        }
      });
      
      // Handle error
      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
  
  /**
   * Execute task by sending to a microservice
   * @param {Object} task - Task to execute
   * @returns {Promise<Object>} - Task result
   */
  async executeAsMicroservice(task) {
    // In a real implementation, this would send the task to a dedicated microservice
    // For demonstration, we'll simulate with a delay
    return new Promise((resolve) => {
      console.log(`Sending task ${task.id} to microservice (simulated)`);
      
      // Simulate microservice execution
      setTimeout(() => {
        resolve({
          message: 'Task executed by microservice (simulated)',
          task: task.id,
          type: task.type,
          timestamp: new Date().toISOString()
        });
      }, 1000);
      
      // In a real implementation, you would:
      // 1. Send the task to a message queue (RabbitMQ, Kafka, etc.)
      // 2. The microservice would pick up the task
      // 3. The microservice would execute the task and return the result
      // 4. The orchestrator would receive the result via callback or polling
    });
  }
  
  /**
   * Acquire a distributed lock
   * @param {string} lockKey - Lock key
   * @param {string} ownerId - Owner ID
   * @returns {Promise<boolean>} - Whether lock was acquired
   */
  async acquireLock(lockKey, ownerId) {
    // If Redis is not available, assume lock is acquired
    if (!this.redisClient) {
      return true;
    }
    
    try {
      // Use Redis SET NX with expiry
      const key = `${this.namespace}lock:${lockKey}`;
      const result = await this.redisClient.set(
        key,
        ownerId,
        'NX',
        'PX',
        this.lockTimeout
      );
      
      const acquired = result === 'OK';
      
      if (acquired) {
        this.metrics.locksAcquired++;
        
        // Start extending lock periodically
        this.startLockExtension(lockKey, ownerId);
      }
      
      return acquired;
    } catch (error) {
      console.error(`Error acquiring lock for ${lockKey}:`, error);
      // Assume lock failed
      return false;
    }
  }
  
  /**
   * Start extending a lock periodically
   * @param {string} lockKey - Lock key
   * @param {string} ownerId - Owner ID
   */
  startLockExtension(lockKey, ownerId) {
    const extensionKey = `${lockKey}:${ownerId}`;
    
    // Create interval to extend lock
    const intervalId = setInterval(async () => {
      try {
        // Only extend if we still own the lock
        const key = `${this.namespace}lock:${lockKey}`;
        const script = `
          if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('pexpire', KEYS[1], ARGV[2])
          else
            return 0
          end
        `;
        
        const result = await this.redisClient.eval(
          script,
          1,
          key,
          ownerId,
          this.lockTimeout
        );
        
        if (result === 0) {
          // We no longer own the lock
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error(`Error extending lock for ${lockKey}:`, error);
        clearInterval(intervalId);
      }
    }, Math.floor(this.lockTimeout / 3));
    
    // Store interval ID for cleanup
    this.activeLockExtensions = this.activeLockExtensions || new Map();
    this.activeLockExtensions.set(extensionKey, intervalId);
  }
  
  /**
   * Release a distributed lock
   * @param {string} lockKey - Lock key
   * @param {string} ownerId - Owner ID
   * @returns {Promise<boolean>} - Whether lock was released
   */
  async releaseLock(lockKey, ownerId) {
    // Stop lock extension
    const extensionKey = `${lockKey}:${ownerId}`;
    if (this.activeLockExtensions && this.activeLockExtensions.has(extensionKey)) {
      clearInterval(this.activeLockExtensions.get(extensionKey));
      this.activeLockExtensions.delete(extensionKey);
    }
    
    // If Redis is not available, assume lock is released
    if (!this.redisClient) {
      return true;
    }
    
    try {
      // Only release if we still own the lock
      const key = `${this.namespace}lock:${lockKey}`;
      const script = `
        if redis.call('get', KEYS[1]) == ARGV[1] then
          return redis.call('del', KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.redisClient.eval(
        script,
        1,
        key,
        ownerId
      );
      
      const released = result === 1;
      
      if (released) {
        this.metrics.locksReleased++;
      }
      
      return released;
    } catch (error) {
      console.error(`Error releasing lock for ${lockKey}:`, error);
      // Assume lock release failed
      return false;
    }
  }
  
  /**
   * Check if system resources are available for task execution
   * @returns {Promise<boolean>} - Whether resources are available
   */
  async checkResourceAvailability() {
    // In a full implementation, this would check:
    // 1. CPU usage
    // 2. Memory usage
    // 3. Disk I/O
    // 4. Network I/O
    
    // For simplicity, we'll just check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    return memoryPercent < this.resourceControl.memoryThreshold;
  }
  
  /**
   * Get task status
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Task status
   */
  async getTaskStatus(taskId) {
    // Check active tasks first
    if (this.activeTasks.has(taskId)) {
      return this.activeTasks.get(taskId);
    }
    
    // If Redis is available, check there
    if (this.redisClient) {
      try {
        const taskKey = `${this.namespace}task:${taskId}`;
        const taskData = await this.redisClient.get(taskKey);
        
        if (taskData) {
          return JSON.parse(taskData);
        }
      } catch (error) {
        console.error(`Error getting task status for ${taskId}:`, error);
      }
    }
    
    return null;
  }
  
  /**
   * Get orchestrator metrics
   * @returns {Object} - Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      runningTasks: this.runningTaskCount,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      mode: this.executorMode
    };
  }
  
  /**
   * Get active tasks
   * @returns {Object[]} - Active tasks
   */
  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }
  
  /**
   * Schedule a mark expired data task
   * @param {Object} options - Task options
   * @returns {Promise<Object>} - Task info
   */
  async scheduleMarkExpiredData(options = {}) {
    return this.scheduleTask(
      TASK_TYPES.MARK_EXPIRED_DATA, 
      {}, 
      {
        priority: PRIORITY.NORMAL,
        impact: IMPACT.LOW,
        lockKey: 'mark_expired_data',
        ...options
      }
    );
  }
  
  /**
   * Schedule a delete expired data task
   * @param {Object} options - Task options
   * @returns {Promise<Object>} - Task info
   */
  async scheduleDeleteExpiredData(options = {}) {
    return this.scheduleTask(
      TASK_TYPES.DELETE_EXPIRED_DATA, 
      {}, 
      {
        priority: PRIORITY.HIGH,
        impact: IMPACT.MODERATE,
        lockKey: 'delete_expired_data',
        ...options
      }
    );
  }
  
  /**
   * Schedule a data backup task
   * @param {string} teamId - Team ID to backup
   * @param {Object} options - Task options
   * @returns {Promise<Object>} - Task info
   */
  async scheduleDataBackup(teamId, options = {}) {
    return this.scheduleTask(
      TASK_TYPES.DATA_BACKUP, 
      { teamId }, 
      {
        priority: PRIORITY.HIGH,
        impact: IMPACT.MODERATE,
        lockKey: `data_backup:${teamId}`,
        ...options
      }
    );
  }
}

// Create singleton instance
const taskOrchestrator = new TaskOrchestrator();

module.exports = {
  taskOrchestrator,
  TaskOrchestrator,
  PRIORITY,
  TASK_TYPES,
  IMPACT,
  EXECUTOR_MODE
}; 