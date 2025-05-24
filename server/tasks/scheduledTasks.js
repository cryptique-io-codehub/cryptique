const dataRetentionService = require('../services/dataRetentionService');
const { taskScheduler } = require('./taskScheduler');
const cron = require('node-cron');

/**
 * Setup scheduled tasks using cron
 * This sets up recurring tasks with proper scheduling
 */
function setupScheduledTasks() {
  // Daily task for marking expired data (runs at 1:00 AM)
  cron.schedule('0 1 * * *', async () => {
    console.log('Running scheduled task: Mark expired data for deletion');
    await taskScheduler.scheduleMarkExpiredData();
  }, {
    timezone: 'UTC'
  });
  
  // Weekly task for deleting expired data (runs at 3:00 AM on Sunday)
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running scheduled task: Delete expired data');
    await taskScheduler.scheduleDeleteExpiredData();
  }, {
    timezone: 'UTC'
  });
  
  console.log('Scheduled tasks setup complete');
  
  // Start task polling if in distributed mode
  if (taskScheduler.distributed) {
    taskScheduler.startPolling();
  }
}

/**
 * Run scheduled tasks manually
 * This can be called directly to trigger tasks instead of waiting for cron
 */
const runScheduledTasks = async () => {
  try {
    console.log('Starting scheduled tasks', new Date().toISOString());
    
    // Use task scheduler for data retention
    await taskScheduler.scheduleMarkExpiredData();
    await taskScheduler.scheduleDeleteExpiredData();
    
    console.log('Completed scheduled tasks', new Date().toISOString());
    return taskScheduler.getMetrics();
  } catch (error) {
    console.error('Error running scheduled tasks:', error);
    throw error;
  }
};

/**
 * Run data retention tasks directly (without scheduler)
 * Useful for testing or direct invocation
 */
const runDataRetentionTasks = async () => {
  try {
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
 * Get task metrics
 * For monitoring task execution and performance
 */
const getTaskMetrics = () => {
  return taskScheduler.getMetrics();
};

/**
 * Get active tasks
 * For monitoring currently running tasks
 */
const getActiveTasks = () => {
  return taskScheduler.getActiveJobs();
};

// If running directly, execute the tasks
if (require.main === module) {
  runScheduledTasks()
    .then((result) => {
      console.log('Tasks completed with result:', result);
      
      // Give time for distributed tasks to complete or be properly scheduled
      setTimeout(() => {
        if (!taskScheduler.distributed) {
          process.exit(0);
        } else {
          console.log('Tasks scheduled in distributed mode. Process will continue running.');
          console.log('Press Ctrl+C to exit.');
        }
      }, 1000);
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
  getActiveTasks
}; 