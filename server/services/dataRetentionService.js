const Team = require('../models/team');
const mongoose = require('mongoose');
const { executeWithRetry } = require('../utils/dbOperations');
const { performance } = require('perf_hooks');
const os = require('os');

/**
 * Data retention policy settings
 */
const RETENTION_POLICY = {
  GRACE_PERIOD_DAYS: 30,         // Full access to view data (read-only)
  RETENTION_PERIOD_DAYS: 90,     // Data kept but not accessible
  DATA_BACKUP_PERIOD_DAYS: 180,  // Backup retained offline after deletion
};

/**
 * Performance configuration for batch operations
 */
const PERFORMANCE_CONFIG = {
  // Default batch size for data operations
  DEFAULT_BATCH_SIZE: 10,
  
  // Number of concurrent operations to run
  // Defaults to number of CPU cores - 1 (to avoid resource exhaustion)
  CONCURRENCY: Math.max(1, os.cpus().length - 1),
  
  // Maximum batch size for backups - larger values may cause memory issues
  MAX_BACKUP_BATCH_SIZE: 5,
  
  // Delay between batches to prevent database overload (in ms)
  BATCH_DELAY: 500
};

/**
 * Process items in batches with controlled concurrency
 * @param {Array} items - Items to process
 * @param {Function} processFunction - Function to process each batch
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} - Processing results
 */
async function processBatches(items, processFunction, options = {}) {
  const {
    batchSize = PERFORMANCE_CONFIG.DEFAULT_BATCH_SIZE,
    concurrency = PERFORMANCE_CONFIG.CONCURRENCY,
    batchDelay = PERFORMANCE_CONFIG.BATCH_DELAY,
    onBatchComplete = null
  } = options;
  
  const startTime = performance.now();
  const results = {
    totalItems: items.length,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    errors: [],
    batches: 0,
    duration: 0
  };
  
  // If no items, return early
  if (items.length === 0) {
    results.duration = performance.now() - startTime;
    return results;
  }
  
  // Split items into batches
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  
  console.log(`Processing ${items.length} items in ${batches.length} batches with concurrency ${concurrency}`);
  
  // Process batches with controlled concurrency
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchPromises = batches
      .slice(i, i + concurrency)
      .map(async (batch, batchIndex) => {
        const currentBatchIndex = i + batchIndex;
        try {
          console.log(`Processing batch ${currentBatchIndex + 1}/${batches.length}`);
          
          const batchResults = await processFunction(batch, currentBatchIndex);
          
          results.processedItems += batch.length;
          results.successfulItems += batchResults.successful || 0;
          results.failedItems += batchResults.failed || 0;
          
          if (batchResults.errors && batchResults.errors.length > 0) {
            results.errors.push(...batchResults.errors);
          }
          
          results.batches++;
          
          // Optional callback for batch completion
          if (onBatchComplete) {
            onBatchComplete(batchResults, currentBatchIndex);
          }
          
          return batchResults;
        } catch (error) {
          console.error(`Error processing batch ${currentBatchIndex + 1}:`, error);
          results.errors.push({
            batch: currentBatchIndex,
            error: error.message
          });
          results.failedItems += batch.length;
          results.processedItems += batch.length;
          return { successful: 0, failed: batch.length, errors: [error.message] };
        }
      });
    
    // Wait for current set of batches to complete
    await Promise.all(batchPromises);
    
    // Add delay between batch sets to reduce database load
    if (i + concurrency < batches.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  results.duration = performance.now() - startTime;
  console.log(`Processed ${results.processedItems} items in ${results.duration.toFixed(2)}ms`);
  return results;
}

/**
 * Mark data as pending deletion for teams with expired subscriptions
 * Run this as a scheduled task (e.g., daily)
 */
const markExpiredDataForDeletion = async () => {
  try {
    const now = new Date();
    
    // Get total count first for pagination
    const totalTeamsToMark = await Team.countDocuments({
      'subscription.status': { $in: ['inactive', 'pastdue', 'cancelled'] },
      'subscription.endDate': { 
        $lt: new Date(now.getTime() - (RETENTION_POLICY.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)) 
      },
      'dataDeletionScheduled': { $exists: false }
    });
    
    console.log(`Found ${totalTeamsToMark} teams to mark for data deletion`);
    
    if (totalTeamsToMark === 0) {
      return { teamsProcessed: 0 };
    }
    
    // Schedule deletion date (retention period days after grace period ends)
    const deletionDate = new Date(
      now.getTime() + (RETENTION_POLICY.RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    );
    
    // Use pagination to process teams in batches
    const BATCH_SIZE = PERFORMANCE_CONFIG.DEFAULT_BATCH_SIZE;
    let processedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Process in batches using pagination
    for (let skip = 0; skip < totalTeamsToMark; skip += BATCH_SIZE) {
      // Find batch of teams
      const teams = await Team.findTeamsWithExpiredSubscriptionsWithRetry(
        RETENTION_POLICY.GRACE_PERIOD_DAYS,
        { skip, limit: BATCH_SIZE }
      );
      
      console.log(`Processing batch of ${teams.length} teams for marking (${skip + 1}-${Math.min(skip + BATCH_SIZE, totalTeamsToMark)} of ${totalTeamsToMark})`);
      
      // Process batch with controlled concurrency
      const batchResults = await processBatches(
        teams,
        async (teamBatch) => {
          const batchResults = {
            successful: 0,
            failed: 0,
            errors: []
          };
          
          // Process each team in the batch
          await Promise.all(teamBatch.map(async (team) => {
            try {
              await Team.markForDeletionWithRetry(team._id, deletionDate);
              console.log(`Marked team ${team._id} (${team.name}) for data deletion on ${deletionDate}`);
              batchResults.successful++;
            } catch (error) {
              console.error(`Error marking team ${team._id} for deletion:`, error);
              batchResults.failed++;
              batchResults.errors.push({
                teamId: team._id,
                error: error.message
              });
            }
          }));
          
          return batchResults;
        },
        { 
          batchSize: Math.min(BATCH_SIZE, PERFORMANCE_CONFIG.CONCURRENCY), 
          concurrency: PERFORMANCE_CONFIG.CONCURRENCY
        }
      );
      
      processedCount += batchResults.successfulItems;
      errorCount += batchResults.failedItems;
      errors.push(...batchResults.errors);
      
      // Small delay between pagination batches to reduce DB load
      if (skip + BATCH_SIZE < totalTeamsToMark) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      teamsProcessed: processedCount,
      teamsWithErrors: errorCount,
      errors: errors,
      scheduledDeletionDate: deletionDate
    };
  } catch (error) {
    console.error('Error marking expired data for deletion:', error);
    throw error;
  }
};

/**
 * Delete data for teams that have passed the retention period
 * Run this as a scheduled task (e.g., weekly)
 */
const deleteExpiredData = async () => {
  try {
    const now = new Date();
    
    // Get total count first for reporting
    const totalTeamsToDelete = await Team.countDocuments({
      dataDeletionScheduled: true,
      dataDeletionDate: { $lt: now }
    });
    
    console.log(`Found ${totalTeamsToDelete} teams ready for data deletion`);
    
    if (totalTeamsToDelete === 0) {
      return { teamsProcessed: 0, deletedTeams: [] };
    }
    
    // Setup tracking for results
    const results = {
      teamsProcessed: 0,
      deletedTeams: [],
      errors: []
    };
    
    // Use pagination to get teams in manageable batches
    const BATCH_SIZE = PERFORMANCE_CONFIG.DEFAULT_BATCH_SIZE;
    
    for (let skip = 0; skip < totalTeamsToDelete; skip += BATCH_SIZE) {
      // Find batch of teams
      const teams = await Team.findTeamsScheduledForDeletionWithRetry(
        { skip, limit: BATCH_SIZE }
      );
      
      console.log(`Processing batch of ${teams.length} teams for deletion (${skip + 1}-${Math.min(skip + BATCH_SIZE, totalTeamsToDelete)} of ${totalTeamsToDelete})`);
      
      // Process teams in this batch with controlled concurrency and smaller batch size for backups
      const batchResults = await processBatches(
        teams,
        async (teamBatch) => {
          const batchResults = {
            successful: 0,
            failed: 0,
            errors: [],
            deletedTeams: []
          };
          
          // Important: Use a smaller batch size for backup operations, which are more resource-intensive
          const backupBatchSize = Math.min(teamBatch.length, PERFORMANCE_CONFIG.MAX_BACKUP_BATCH_SIZE);
          
          // Process backups sequentially in smaller batches to avoid memory issues
          for (let i = 0; i < teamBatch.length; i += backupBatchSize) {
            const backupBatch = teamBatch.slice(i, i + backupBatchSize);
            
            // Create backups one at a time to avoid overloading system
            for (const team of backupBatch) {
              try {
                // Backup team data (this operation can be resource-intensive)
                await createDataBackup(team._id);
                
                // Calculate backup retention date
                const backupRetentionDate = new Date(
                  now.getTime() + (RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS * 24 * 60 * 60 * 1000)
                );
                
                // Mark data as deleted
                await Team.markDataAsDeletedWithRetry(team._id, backupRetentionDate);
                
                batchResults.successful++;
                batchResults.deletedTeams.push(team._id);
                console.log(`Deleted data for team ${team._id} (${team.name})`);
              } catch (error) {
                console.error(`Error deleting data for team ${team._id}:`, error);
                batchResults.failed++;
                batchResults.errors.push({
                  teamId: team._id,
                  error: error.message
                });
              }
            }
            
            // Brief pause between backup batches to prevent resource spikes
            if (i + backupBatchSize < teamBatch.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          return batchResults;
        },
        { 
          // Use smaller batch size for backups to avoid memory issues
          batchSize: Math.min(BATCH_SIZE, PERFORMANCE_CONFIG.MAX_BACKUP_BATCH_SIZE),
          // Lower concurrency for backup operations as they're more resource intensive
          concurrency: Math.max(1, Math.floor(PERFORMANCE_CONFIG.CONCURRENCY / 2)),
          // Longer delay between batches due to heavy I/O operations
          batchDelay: PERFORMANCE_CONFIG.BATCH_DELAY * 2,
          // Callback to accumulate results
          onBatchComplete: (batchResults) => {
            if (batchResults.deletedTeams && batchResults.deletedTeams.length > 0) {
              results.deletedTeams.push(...batchResults.deletedTeams);
            }
          }
        }
      );
      
      results.teamsProcessed += batchResults.successfulItems + batchResults.failedItems;
      results.errors.push(...batchResults.errors);
      
      // Longer delay between pagination batches for deletion operations
      if (skip + BATCH_SIZE < totalTeamsToDelete) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error deleting expired data:', error);
    throw error;
  }
};

/**
 * Create a data backup for a team with streaming to avoid memory issues
 * @param {string} teamId - ID of the team
 */
const createDataBackup = async (teamId) => {
  // Wrap with retry logic
  return executeWithRetry(
    async () => {
      const startTime = performance.now();
      
      // Log backup start
      console.log(`Starting backup for team ${teamId}`);
      
      try {
        // In a real implementation, this would use streaming to backup:
        // 1. Use MongoDB cursor to stream data
        // 2. Process chunks to avoid loading everything into memory
        // 3. Stream data directly to storage (S3, GCS, etc.)
        
        // Simulate a streaming backup with resource management
        await simulateStreamingBackup(teamId);
        
        const duration = performance.now() - startTime;
        console.log(`Completed backup for team ${teamId} in ${duration.toFixed(2)}ms`);
        
        return { 
          success: true, 
          backupId: `backup_${teamId}_${Date.now()}`,
          duration
        };
      } catch (error) {
        const duration = performance.now() - startTime;
        console.error(`Backup failed for team ${teamId} after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    },
    { 
      operation_name: `Create backup for team ${teamId}`,
      // Increase retries for backup operations
      maxRetries: 5,
      // Longer retry delay for backups
      retryDelay: 2000
    }
  );
};

/**
 * Simulate a streaming backup operation with proper resource management
 * In a real implementation, this would stream data directly to storage
 * @param {string} teamId - Team ID to backup
 */
async function simulateStreamingBackup(teamId) {
  // This is a placeholder for a real streaming backup implementation
  // In a production system, you would:
  
  // 1. Create a MongoDB cursor for each collection to backup
  // const teamCursor = Team.find({ _id: teamId }).cursor();
  // const relatedDataCursor = RelatedModel.find({ teamId }).cursor();
  
  // 2. Stream each document in small batches
  // while (await teamCursor.hasNext()) {
  //   const doc = await teamCursor.next();
  //   await backupStorage.write(doc);
  // }
  
  // 3. Close cursors and connections when done
  // await teamCursor.close();
  // await relatedDataCursor.close();
  
  // For this simulation, we'll just add a small delay
  return new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Check if a team's data is in grace period, retention period, or deleted
 * @param {string} teamId - ID of the team to check
 * @returns {Object} Status information
 */
const checkDataRetentionStatus = async (teamId) => {
  // Wrap with retry logic
  return executeWithRetry(
    async () => {
      const team = await Team.findByIdWithRetry(teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // If data is already deleted
      if (team.dataDeleted) {
        return {
          status: 'DELETED',
          deletedAt: team.dataDeletionExecutedDate,
          backupAvailableUntil: team.dataBackupRetentionDate
        };
      }
      
      // If data is scheduled for deletion
      if (team.dataDeletionScheduled) {
        return {
          status: 'PENDING_DELETION',
          scheduledDeletionDate: team.dataDeletionDate,
          daysUntilDeletion: Math.ceil(
            (team.dataDeletionDate - new Date()) / (24 * 60 * 60 * 1000)
          )
        };
      }
      
      // If subscription is inactive, calculate grace period
      if (team.subscription.status !== 'active' && team.subscription.endDate) {
        const endDate = new Date(team.subscription.endDate);
        const gracePeriodEndDate = new Date(endDate);
        gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + RETENTION_POLICY.GRACE_PERIOD_DAYS);
        
        if (new Date() <= gracePeriodEndDate) {
          return {
            status: 'GRACE_PERIOD',
            gracePeriodEndDate,
            daysLeftInGracePeriod: Math.ceil(
              (gracePeriodEndDate - new Date()) / (24 * 60 * 60 * 1000)
            )
          };
        } else {
          // In retention period, but not yet marked for deletion
          // This is an intermediate state before the scheduled task runs
          return {
            status: 'RETENTION_PERIOD',
            gracePeriodEndDate,
            retentionPeriodEndDate: new Date(
              gracePeriodEndDate.getTime() + (RETENTION_POLICY.RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000)
            )
          };
        }
      }
      
      // Active subscription
      return {
        status: 'ACTIVE',
        subscriptionStatus: team.subscription.status,
        subscriptionEndDate: team.subscription.endDate
      };
    },
    { operation_name: `Check data retention status for team ${teamId}` }
  );
};

/**
 * Recover team data with improved handling
 * @param {string} teamId - ID of the team
 */
const recoverTeamData = async (teamId) => {
  // Implementation largely unchanged, using existing retry logic
  return executeWithRetry(
    async () => {
      const team = await Team.findByIdWithRetry(teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      if (team.dataDeleted) {
        if (team.dataBackupRetentionDate && new Date() <= team.dataBackupRetentionDate) {
          await Team.updateOneWithRetry(
            { _id: teamId },
            {
              dataDeleted: false,
              dataDeletionScheduled: false,
              dataDeletionDate: null,
              dataDeletionExecutedDate: null,
              dataBackupRetentionDate: null,
              'subscription.status': 'active'
            }
          );
          
          return {
            success: true,
            message: 'Team data has been recovered from backup',
            recoveredFrom: 'backup'
          };
        } else {
          return {
            success: false,
            message: 'Team data backup is no longer available and cannot be recovered',
            recoveredFrom: null
          };
        }
      }
      
      if (team.dataDeletionScheduled) {
        await Team.updateOneWithRetry(
          { _id: teamId },
          {
            dataDeletionScheduled: false,
            dataDeletionDate: null,
            'subscription.status': 'active'
          }
        );
        
        return {
          success: true,
          message: 'Team data retention has been restored',
          recoveredFrom: 'pending_deletion'
        };
      }
      
      return {
        success: true,
        message: 'Team data is already available',
        recoveredFrom: null
      };
    },
    { operation_name: `Recover data for team ${teamId}` }
  );
};

module.exports = {
  RETENTION_POLICY,
  PERFORMANCE_CONFIG,
  markExpiredDataForDeletion,
  deleteExpiredData,
  checkDataRetentionStatus,
  recoverTeamData,
  processBatches // Export for testing and reuse
}; 