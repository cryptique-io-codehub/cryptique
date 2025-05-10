const dataRetentionService = require('../services/dataRetentionService');

/**
 * Run scheduled tasks
 * This can be set up to run with a cron job or a scheduling library like node-schedule
 */
const runScheduledTasks = async () => {
  try {
    console.log('Starting scheduled tasks', new Date().toISOString());
    
    // Process data retention tasks
    await runDataRetentionTasks();
    
    console.log('Completed scheduled tasks', new Date().toISOString());
  } catch (error) {
    console.error('Error running scheduled tasks:', error);
  }
};

/**
 * Run data retention related tasks
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

// If running directly, execute the tasks
if (require.main === module) {
  runScheduledTasks()
    .then(() => {
      console.log('Tasks completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Task error:', error);
      process.exit(1);
    });
}

module.exports = {
  runScheduledTasks,
  runDataRetentionTasks
}; 