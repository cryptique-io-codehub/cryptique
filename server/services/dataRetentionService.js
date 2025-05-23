const Team = require('../models/team');
const mongoose = require('mongoose');
const { executeWithRetry } = require('../utils/dbOperations');

/**
 * Data retention policy settings
 */
const RETENTION_POLICY = {
  GRACE_PERIOD_DAYS: 30,         // Full access to view data (read-only)
  RETENTION_PERIOD_DAYS: 90,     // Data kept but not accessible
  DATA_BACKUP_PERIOD_DAYS: 180,  // Backup retained offline after deletion
};

/**
 * Mark data as pending deletion for teams with expired subscriptions
 * Run this as a scheduled task (e.g., daily)
 */
const markExpiredDataForDeletion = async () => {
  try {
    const now = new Date();
    
    // Find teams with expired subscriptions beyond the grace period using retry
    const teams = await Team.findTeamsWithExpiredSubscriptionsWithRetry(RETENTION_POLICY.GRACE_PERIOD_DAYS);
    
    console.log(`Found ${teams.length} teams with expired subscriptions beyond grace period`);
    
    // Schedule deletion date (retention period days after grace period ends)
    const deletionDate = new Date(
      now.getTime() + (RETENTION_POLICY.RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    );
    
    // Mark teams for data deletion with retry
    for (const team of teams) {
      await Team.markForDeletionWithRetry(team._id, deletionDate);
      
      console.log(`Marked team ${team._id} (${team.name}) for data deletion on ${deletionDate}`);
      
      // TODO: Send notification to team owner about pending data deletion
    }
    
    return {
      teamsProcessed: teams.length,
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
    
    // Find teams scheduled for deletion that have passed their deletion date
    const teams = await Team.findTeamsScheduledForDeletionWithRetry();
    
    console.log(`Found ${teams.length} teams ready for data deletion`);
    
    // Process each team
    const results = {
      teamsProcessed: teams.length,
      deletedTeams: [],
      errors: []
    };
    
    // Process in batches to prevent memory issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < teams.length; i += BATCH_SIZE) {
      const batch = teams.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i/BATCH_SIZE + 1} of ${Math.ceil(teams.length/BATCH_SIZE)}`);
      
      // Process batch concurrently with limits
      await Promise.all(batch.map(async (team) => {
        try {
          // Create backup (in a real implementation)
          await createDataBackup(team._id);
          
          // Calculate backup retention date
          const backupRetentionDate = new Date(
            now.getTime() + (RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS * 24 * 60 * 60 * 1000)
          );
          
          // Delete team data with retry
          await Team.markDataAsDeletedWithRetry(team._id, backupRetentionDate);
          
          results.deletedTeams.push(team._id);
          console.log(`Deleted data for team ${team._id} (${team.name})`);
        } catch (error) {
          console.error(`Error deleting data for team ${team._id}:`, error);
          results.errors.push({
            teamId: team._id,
            error: error.message
          });
        }
      }));
    }
    
    return results;
  } catch (error) {
    console.error('Error deleting expired data:', error);
    throw error;
  }
};

/**
 * Create a data backup for a team (placeholder implementation)
 * @param {string} teamId - ID of the team
 */
const createDataBackup = async (teamId) => {
  // Wrap with retry logic
  return executeWithRetry(
    async () => {
      // In a real implementation, this would:
      // 1. Query all data related to the team
      // 2. Store it in a backup format (JSON, CSV, etc.)
      // 3. Upload to secure cold storage
      // 4. Record the backup reference in a backup tracking system
      
      console.log(`Created backup for team ${teamId} data`);
      return { success: true, backupId: `backup_${teamId}_${Date.now()}` };
    },
    { operation_name: `Create backup for team ${teamId}` }
  );
};

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
 * Recover data for a team that has renewed their subscription
 * @param {string} teamId - ID of the team
 */
const recoverTeamData = async (teamId) => {
  // Wrap with retry logic
  return executeWithRetry(
    async () => {
      const team = await Team.findByIdWithRetry(teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      // Check if team data was deleted
      if (team.dataDeleted) {
        // If backup is still within retention period
        if (team.dataBackupRetentionDate && new Date() <= team.dataBackupRetentionDate) {
          // In a real implementation, you would restore from backup
          // For this example, we'll just mark the data as recovered
          
          await Team.updateOneWithRetry(
            { _id: teamId },
            {
              dataDeleted: false,
              dataDeletionScheduled: false,
              dataDeletionDate: null,
              dataDeletionExecutedDate: null,
              dataBackupRetentionDate: null,
              'subscription.status': 'active' // This should be handled by payment process
            }
          );
          
          return {
            success: true,
            message: 'Team data has been recovered from backup',
            recoveredFrom: 'backup'
          };
        } else {
          // Backup no longer available
          return {
            success: false,
            message: 'Team data backup is no longer available and cannot be recovered',
            recoveredFrom: null
          };
        }
      }
      
      // If data was scheduled for deletion but not yet deleted
      if (team.dataDeletionScheduled) {
        await Team.updateOneWithRetry(
          { _id: teamId },
          {
            dataDeletionScheduled: false,
            dataDeletionDate: null,
            'subscription.status': 'active' // This should be handled by payment process
          }
        );
        
        return {
          success: true,
          message: 'Team data retention has been restored',
          recoveredFrom: 'pending_deletion'
        };
      }
      
      // Data wasn't deleted or scheduled for deletion
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
  markExpiredDataForDeletion,
  deleteExpiredData,
  checkDataRetentionStatus,
  recoverTeamData
}; 