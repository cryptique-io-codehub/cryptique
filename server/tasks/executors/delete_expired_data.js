/**
 * Delete Expired Data Task Executor
 * 
 * This is a standalone script that executes the delete expired data task.
 * It's designed to run as a separate process to avoid impacting the main application.
 * It includes resource-aware execution to minimize impact on system performance.
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');
const path = require('path');
const dotenv = require('dotenv');
const os = require('os');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import required services and models
const dataRetentionService = require('../../services/dataRetentionService');

// Get task data from environment variables
const taskId = process.env.TASK_ID;
let taskData = {};

try {
  taskData = process.env.TASK_DATA ? JSON.parse(process.env.TASK_DATA) : {};
} catch (error) {
  console.error('Error parsing task data:', error);
  process.exit(1);
}

// Resource control settings
const RESOURCE_LIMITS = {
  CPU_THRESHOLD: parseFloat(process.env.CPU_THRESHOLD || '70'),  // Throttle if CPU > 70%
  MEMORY_THRESHOLD: parseFloat(process.env.MEMORY_THRESHOLD || '75'),  // Throttle if Memory > 75%
  BATCH_SIZE_MIN: parseInt(process.env.BATCH_SIZE_MIN || '3', 10),
  BATCH_SIZE_MAX: parseInt(process.env.BATCH_SIZE_MAX || '25', 10),
  BATCH_DELAY_MIN: parseInt(process.env.BATCH_DELAY_MIN || '500', 10),  // ms
  BATCH_DELAY_MAX: parseInt(process.env.BATCH_DELAY_MAX || '5000', 10),  // ms
  RESOURCE_CHECK_INTERVAL: parseInt(process.env.RESOURCE_CHECK_INTERVAL || '10000', 10)  // 10 seconds
};

// State variables for resource monitoring
let currentBatchSize = 5;  // Start conservative
let currentBatchDelay = 1000;  // Start with 1 second delay between batches
let resourceCheckIntervalId = null;

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
async function connectToMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptique';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Execute the delete expired data task
 * @param {Object} data - Task data
 * @returns {Promise<Object>} - Task result
 */
async function executeTask(data) {
  // Start resource monitoring
  startResourceMonitoring();
  
  // Apply initial performance settings
  updatePerformanceConfig();
  
  console.log(`Executing delete expired data task with initial batch size: ${currentBatchSize}`);
  
  // Track performance
  const startTime = performance.now();
  
  // Execute the actual task with any parameters from taskData
  const result = await dataRetentionService.deleteExpiredData(data);
  
  // Stop resource monitoring
  stopResourceMonitoring();
  
  // Calculate and log performance metrics
  const duration = performance.now() - startTime;
  const memoryUsage = process.memoryUsage();
  
  // Add detailed metrics to result
  const enhancedResult = {
    ...result,
    _metrics: {
      duration: duration,
      memoryUsage: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),  // MB
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),  // MB
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),  // MB
        external: Math.round((memoryUsage.external || 0) / 1024 / 1024)  // MB
      },
      batchSize: currentBatchSize,
      batchDelay: currentBatchDelay,
      taskId: taskId
    }
  };
  
  console.log(`Task completed in ${(duration / 1000).toFixed(2)}s, memory used: ${enhancedResult._metrics.memoryUsage.heapUsed}MB`);
  
  return enhancedResult;
}

/**
 * Start monitoring system resources and adjusting performance parameters
 */
function startResourceMonitoring() {
  console.log('Starting resource monitoring...');
  
  resourceCheckIntervalId = setInterval(() => {
    // Get resource utilization
    const resourceUsage = getResourceUsage();
    
    // Adjust batch size and delay based on resource usage
    if (resourceUsage.cpuUtilization > RESOURCE_LIMITS.CPU_THRESHOLD || 
        resourceUsage.memoryUtilization > RESOURCE_LIMITS.MEMORY_THRESHOLD) {
      // High resource usage - scale back
      currentBatchSize = Math.max(
        RESOURCE_LIMITS.BATCH_SIZE_MIN, 
        Math.floor(currentBatchSize * 0.7)  // Reduce by 30%
      );
      
      currentBatchDelay = Math.min(
        RESOURCE_LIMITS.BATCH_DELAY_MAX,
        currentBatchDelay * 1.5  // Increase by 50%
      );
      
      console.log(`High resource usage detected - reducing batch size to ${currentBatchSize}, increasing delay to ${currentBatchDelay}ms`);
    } else if (resourceUsage.cpuUtilization < RESOURCE_LIMITS.CPU_THRESHOLD * 0.5 && 
               resourceUsage.memoryUtilization < RESOURCE_LIMITS.MEMORY_THRESHOLD * 0.5) {
      // Low resource usage - scale up
      currentBatchSize = Math.min(
        RESOURCE_LIMITS.BATCH_SIZE_MAX,
        Math.floor(currentBatchSize * 1.2)  // Increase by 20%
      );
      
      currentBatchDelay = Math.max(
        RESOURCE_LIMITS.BATCH_DELAY_MIN,
        Math.floor(currentBatchDelay * 0.8)  // Reduce by 20%
      );
      
      console.log(`Low resource usage detected - increasing batch size to ${currentBatchSize}, reducing delay to ${currentBatchDelay}ms`);
    }
    
    // Update performance config with new values
    updatePerformanceConfig();
    
  }, RESOURCE_LIMITS.RESOURCE_CHECK_INTERVAL);
}

/**
 * Stop resource monitoring
 */
function stopResourceMonitoring() {
  if (resourceCheckIntervalId) {
    clearInterval(resourceCheckIntervalId);
    resourceCheckIntervalId = null;
    console.log('Resource monitoring stopped');
  }
}

/**
 * Update performance configuration based on current settings
 */
function updatePerformanceConfig() {
  // Update batch size and delay in the performance config
  dataRetentionService.PERFORMANCE_CONFIG.DEFAULT_BATCH_SIZE = currentBatchSize;
  dataRetentionService.PERFORMANCE_CONFIG.MAX_BACKUP_BATCH_SIZE = Math.max(1, Math.floor(currentBatchSize / 2));
  dataRetentionService.PERFORMANCE_CONFIG.BATCH_DELAY = currentBatchDelay;
}

/**
 * Get current system resource usage
 * @returns {Object} - Resource usage information
 */
function getResourceUsage() {
  // Get CPU usage (this is just an approximation for demonstration)
  // In a real implementation, you'd use a library like node-os-utils for accurate CPU metrics
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const cpuUtilization = 100 - (totalIdle / totalTick * 100);
  
  // Get memory usage
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryUtilization = ((totalMemory - freeMemory) / totalMemory) * 100;
  
  return {
    cpuUtilization,
    memoryUtilization,
    totalMemory: Math.round(totalMemory / 1024 / 1024),  // MB
    freeMemory: Math.round(freeMemory / 1024 / 1024)  // MB
  };
}

/**
 * Main function to run the task
 */
async function main() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
    // Get initial resource usage
    const initialResourceUsage = getResourceUsage();
    console.log(`Initial resource usage: CPU ${initialResourceUsage.cpuUtilization.toFixed(1)}%, Memory ${initialResourceUsage.memoryUtilization.toFixed(1)}%`);
    
    // Execute the task
    const result = await executeTask(taskData);
    
    // Send result back to parent process if running as child process
    if (process.send) {
      process.send({
        type: 'result',
        data: result
      });
    } else {
      console.log('Task result:', JSON.stringify(result, null, 2));
    }
    
    // Close MongoDB connection
    await mongoose.connection.close();
    
    // Exit with success
    process.exit(0);
  } catch (error) {
    console.error('Error executing task:', error);
    
    // Send error to parent process if running as child process
    if (process.send) {
      process.send({
        type: 'error',
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    }
    
    // Stop resource monitoring if still running
    stopResourceMonitoring();
    
    // Close MongoDB connection
    try {
      await mongoose.connection.close();
    } catch (closeError) {
      console.error('Error closing MongoDB connection:', closeError);
    }
    
    // Exit with error
    process.exit(1);
  }
}

// Run the task
main().catch(error => {
  console.error('Unhandled error in task executor:', error);
  process.exit(1);
}); 