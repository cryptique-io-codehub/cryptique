const dataRetentionService = require('../services/dataRetentionService');
const { taskOrchestrator, PRIORITY, IMPACT, EXECUTOR_MODE } = require('../services/taskOrchestratorService');
const cron = require('node-cron');

/**
 * Setup scheduled tasks using cron
 * This sets up recurring tasks with proper scheduling and orchestration
 */
function setupScheduledTasks() {
  // Daily task for marking expired data (runs at 1:00 AM)
  // Lower impact, can run during off-peak hours
  cron.schedule('0 1 * * *', async () => {
    console.log('Running scheduled task: Mark expired data for deletion');
    await taskOrchestrator.scheduleMarkExpiredData({
      priority: PRIORITY.NORMAL,
      impact: IMPACT.LOW,
      executorMode: process.env.MARK_EXPIRED_DATA_EXECUTOR_MODE || EXECUTOR_MODE.CHILD_PROCESS
    });
  }, {
    timezone: 'UTC'
  });
  
  // Weekly task for deleting expired data (runs at 3:00 AM on Sunday)
  // Higher impact, run during lowest activity period
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running scheduled task: Delete expired data');
    await taskOrchestrator.scheduleDeleteExpiredData({
      priority: PRIORITY.HIGH,
      impact: IMPACT.MODERATE,
      executorMode: process.env.DELETE_EXPIRED_DATA_EXECUTOR_MODE || EXECUTOR_MODE.CHILD_PROCESS
    });
  }, {
    timezone: 'UTC'
  });
  
  // Monthly task for system cleanup (runs at 2:00 AM on the first day of the month)
  cron.schedule('0 2 1 * *', async () => {
    console.log('Running scheduled task: System cleanup');
    await taskOrchestrator.scheduleTask(
      'system_cleanup',
      {},
      {
        priority: PRIORITY.LOW,
        impact: IMPACT.MINIMAL,
        executorMode: process.env.SYSTEM_CLEANUP_EXECUTOR_MODE || EXECUTOR_MODE.IN_PROCESS
      }
    );
  }, {
    timezone: 'UTC'
  });
  
  // Health check task (runs every hour)
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled task: Health check');
    await taskOrchestrator.scheduleTask(
      'health_check',
      {},
      {
        priority: PRIORITY.LOW,
        impact: IMPACT.MINIMAL,
        executorMode: EXECUTOR_MODE.IN_PROCESS
      }
    );
  }, {
    timezone: 'UTC'
  });
  
  console.log('Scheduled tasks setup complete');
}

/**
 * Run scheduled tasks manually
 * This can be called directly to trigger tasks instead of waiting for cron
 */
const runScheduledTasks = async () => {
  try {
    console.log('Starting scheduled tasks', new Date().toISOString());
    
    // Schedule tasks via orchestrator
    const markTask = await taskOrchestrator.scheduleMarkExpiredData({
      executorMode: process.env.MARK_EXPIRED_DATA_EXECUTOR_MODE || EXECUTOR_MODE.CHILD_PROCESS
    });
    
    const deleteTask = await taskOrchestrator.scheduleDeleteExpiredData({
      executorMode: process.env.DELETE_EXPIRED_DATA_EXECUTOR_MODE || EXECUTOR_MODE.CHILD_PROCESS
    });
    
    console.log(`Scheduled mark expired data task with ID: ${markTask.taskId}`);
    console.log(`Scheduled delete expired data task with ID: ${deleteTask.taskId}`);
    
    console.log('Tasks scheduled successfully', new Date().toISOString());
    return taskOrchestrator.getMetrics();
  } catch (error) {
    console.error('Error scheduling tasks:', error);
    throw error;
  }
};

/**
 * Run data retention tasks directly (without orchestrator)
 * Useful for testing or direct invocation
 * Note: This is kept for backward compatibility
 */
const runDataRetentionTasks = async () => {
  try {
    console.log('Warning: Running data retention tasks directly (legacy mode)');
    
    // Mark expired data for deletion
    const markedData = await dataRetentionService.markExpiredDataForDeletion();
    console.log(`Marked ${markedData.teamsProcessed} teams for data deletion`);
    
    // Delete data that's past retention period
    const deletedData = await dataRetentionService.deleteExpiredData();
    console.log(`Deleted data for ${deletedData.deletedTeams.length} teams`);
    
    if (deletedData.errors.length > 0) {
      console.error(`Encountered ${deletedData.errors.length} errors during data deletion`);
    }
    
    return {
      markedForDeletion: markedData.teamsProcessed,
      deleted: deletedData.deletedTeams.length,
      errors: deletedData.errors.length
    };
  } catch (error) {
    console.error('Error running data retention tasks:', error);
    throw error;
  }
};

/**
 * Get task metrics from the orchestrator
 * For monitoring task execution and performance
 */
const getTaskMetrics = () => {
  return taskOrchestrator.getMetrics();
};

/**
 * Get active tasks from the orchestrator
 * For monitoring currently running tasks
 */
const getActiveTasks = () => {
  return taskOrchestrator.getActiveTasks();
};

/**
 * Get a specific task status
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} - Task status
 */
const getTaskStatus = async (taskId) => {
  return await taskOrchestrator.getTaskStatus(taskId);
};

// If running directly, execute the tasks
if (require.main === module) {
  runScheduledTasks()
    .then((result) => {
      console.log('Tasks scheduled with result:', result);
      console.log('Note: Tasks will continue running in the background.');
      console.log('Press Ctrl+C to exit after 5 seconds...');
      
      // Keep the process alive for a bit to allow tasks to start
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    })
    .catch(error => {
      console.error('Task error:', error);
      process.exit(1);
    });
}

module.exports = {
  setupScheduledTasks,
  runScheduledTasks,
  runDataRetentionTasks,
  getTaskMetrics,
  getActiveTasks,
  getTaskStatus
}; 