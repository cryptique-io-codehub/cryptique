const express = require('express');
const router = express.Router();
const dataRetentionService = require('../services/dataRetentionService');

/**
 * Get the data retention status for a team
 */
router.get('/:teamId/status', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const status = await dataRetentionService.checkDataRetentionStatus(teamId);
    
    res.json({
      ...status,
      policy: {
        gracePeriodDays: dataRetentionService.RETENTION_POLICY.GRACE_PERIOD_DAYS,
        retentionPeriodDays: dataRetentionService.RETENTION_POLICY.RETENTION_PERIOD_DAYS,
        backupRetentionDays: dataRetentionService.RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS
      }
    });
  } catch (error) {
    console.error('Error getting data retention status:', error);
    res.status(500).json({ error: 'Failed to check data retention status' });
  }
});

/**
 * Recover team data (if within retention period)
 * This would typically be called after subscription renewal
 */
router.post('/:teamId/recover', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // In a real app, you'd check if the user has permission
    // and verify that the subscription has been renewed
    
    const result = await dataRetentionService.recoverTeamData(teamId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Error recovering team data:', error);
    res.status(500).json({ error: 'Failed to recover team data' });
  }
});

module.exports = router; 