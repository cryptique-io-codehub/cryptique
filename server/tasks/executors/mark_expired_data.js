/**
 * Mark Expired Data Task Executor
 * 
 * This is a standalone script that executes the mark expired data task.
 * It's designed to run as a separate process to avoid impacting the main application.
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
 * Execute the mark expired data task
 * @param {Object} data - Task data
 * @returns {Promise<Object>} - Task result
 */
async function executeTask(data) {
  // Set batch size dynamically based on system resources
  const batchSize = calculateOptimalBatchSize();
  
  // Set the batch size in the performance config
  dataRetentionService.PERFORMANCE_CONFIG.DEFAULT_BATCH_SIZE = batchSize;
  
  console.log(`Executing mark expired data task with batch size: ${batchSize}`);
  
  // Track performance
  const startTime = performance.now();
  
  // Execute the actual task with any parameters from taskData
  const result = await dataRetentionService.markExpiredDataForDeletion(data);
  
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
      batchSize: batchSize,
      taskId: taskId
    }
  };
  
  console.log(`Task completed in ${(duration / 1000).toFixed(2)}s, memory used: ${enhancedResult._metrics.memoryUsage.heapUsed}MB`);
  
  return enhancedResult;
}

/**
 * Calculate optimal batch size based on system resources
 * @returns {number} - Calculated batch size
 */
function calculateOptimalBatchSize() {
  // Get available memory (in MB)
  const totalMemory = os.totalmem() / 1024 / 1024;
  const freeMemory = os.freemem() / 1024 / 1024;
  const memoryUtilization = 1 - (freeMemory / totalMemory);
  
  // Calculate batch size based on memory availability
  // Lower batch size when memory utilization is high
  let batchSize = 10; // Default
  
  if (memoryUtilization < 0.5) {
    // Low memory utilization, use larger batch size
    batchSize = 20;
  } else if (memoryUtilization > 0.8) {
    // High memory utilization, use smaller batch size
    batchSize = 5;
  }
  
  // Consider available CPU cores
  const cpuCount = os.cpus().length;
  
  // Adjust batch size based on CPU count
  if (cpuCount > 4) {
    batchSize += 5;
  } else if (cpuCount <= 2) {
    batchSize = Math.max(3, batchSize - 3);
  }
  
  return batchSize;
}

/**
 * Main function to run the task
 */
async function main() {
  try {
    // Connect to MongoDB
    await connectToMongoDB();
    
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