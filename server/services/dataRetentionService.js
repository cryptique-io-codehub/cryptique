const Team = require('../models/team');
const mongoose = require('mongoose');

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
    
    // Find teams with expired subscriptions beyond the grace period
    const teams = await Team.find({
      'subscription.status': { $in: ['inactive', 'pastdue', 'cancelled'] },
      'subscription.endDate': { 
        $lt: new Date(now.getTime() - (RETENTION_POLICY.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)) 
      },
      'dataDeletionScheduled': { $exists: false } // Only mark teams not already scheduled
    });
    
    console.log(`Found ${teams.length} teams with expired subscriptions beyond grace period`);
    
    // Schedule deletion date (retention period days after grace period ends)
    const deletionDate = new Date(
      now.getTime() + (RETENTION_POLICY.RETENTION_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    );
    
    // Mark teams for data deletion
    for (const team of teams) {
      await Team.findByIdAndUpdate(team._id, {
        dataDeletionScheduled: true,
        dataDeletionDate: deletionDate,
        dataRetentionNotificationSent: false
      });
      
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
    const teams = await Team.find({
      dataDeletionScheduled: true,
      dataDeletionDate: { $lt: now }
    });
    
    console.log(`Found ${teams.length} teams ready for data deletion`);
    
    // Process each team
    const results = {
      teamsProcessed: teams.length,
      deletedTeams: [],
      errors: []
    };
    
    for (const team of teams) {
      try {
        // Create backup (in a real implementation)
        await createDataBackup(team._id);
        
        // Delete team data (smart contracts, websites, analytics, etc.)
        // In a real implementation, you'd delete related models
        
        // Keep team record but mark as deleted and remove sensitive data
        await Team.findByIdAndUpdate(team._id, {
          dataDeletionScheduled: false,
          dataDeleted: true,
          dataDeletionExecutedDate: now,
          dataBackupRetentionDate: new Date(
            now.getTime() + (RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS * 24 * 60 * 60 * 1000)
          ),
          // Reset usage counters
          'usage.websites': 0,
          'usage.smartContracts': 0,
          'usage.apiCalls': 0,
          // Keep minimal team info for records
        });
        
        results.deletedTeams.push(team._id);
        console.log(`Deleted data for team ${team._id} (${team.name})`);
      } catch (error) {
        console.error(`Error deleting data for team ${team._id}:`, error);
        results.errors.push({
          teamId: team._id,
          error: error.message
        });
      }
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
  // In a real implementation, this would:
  // 1. Query all data related to the team
  // 2. Store it in a backup format (JSON, CSV, etc.)
  // 3. Upload to secure cold storage
  // 4. Record the backup reference in a backup tracking system
  
  console.log(`Created backup for team ${teamId} data`);
  return { success: true, backupId: `backup_${teamId}_${Date.now()}` };
};

/**
 * Check if a team's data is in grace period, retention period, or deleted
 * @param {string} teamId - ID of the team to check
 * @returns {Object} Status information
 */
const checkDataRetentionStatus = async (teamId) => {
  try {
    const team = await Team.findById(teamId);
    
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
  } catch (error) {
    console.error('Error checking data retention status:', error);
    throw error;
  }
};

/**
 * Recover data for a team that has renewed their subscription
 * @param {string} teamId - ID of the team
 */
const recoverTeamData = async (teamId) => {
  try {
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Check if team data was deleted
    if (team.dataDeleted) {
      // If backup is still within retention period
      if (team.dataBackupRetentionDate && new Date() <= team.dataBackupRetentionDate) {
        // In a real implementation, you would restore from backup
        // For this example, we'll just mark the data as recovered
        
        await Team.findByIdAndUpdate(teamId, {
          dataDeleted: false,
          dataDeletionScheduled: false,
          dataDeletionDate: null,
          dataDeletionExecutedDate: null,
          dataBackupRetentionDate: null,
          'subscription.status': 'active' // This should be handled by payment process
        });
        
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
      await Team.findByIdAndUpdate(teamId, {
        dataDeletionScheduled: false,
        dataDeletionDate: null,
        'subscription.status': 'active' // This should be handled by payment process
      });
      
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
  } catch (error) {
    console.error('Error recovering team data:', error);
    throw error;
  }
};

module.exports = {
  RETENTION_POLICY,
  markExpiredDataForDeletion,
  deleteExpiredData,
  checkDataRetentionStatus,
  recoverTeamData
}; 