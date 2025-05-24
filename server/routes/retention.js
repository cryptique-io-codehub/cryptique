const express = require('express');
const router = express.Router();
const dataRetentionService = require('../services/dataRetentionService');
const { 
  runScheduledTasks, 
  runDataRetentionTasks,
  getTaskMetrics,
  getActiveTasks
} = require('../tasks/scheduledTasks');
const createRateLimiter = require('../middleware/rateLimiter');

// Create rate limiters
const rateLimiters = createRateLimiter();

// Apply authentication middleware (assuming it exists)
// router.use(authMiddleware);

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

// Check data retention status for a team
router.get('/status/:teamId', async (req, res) => {
  try {
    const teamId = req.params.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Team ID is required'
      });
    }
    
    const status = await dataRetentionService.checkDataRetentionStatus(teamId);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error checking data retention status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Recover team data (admin only)
router.post('/recover/:teamId', rateLimiters.sensitive, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    
    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Team ID is required'
      });
    }
    
    // TODO: Check if user has admin privileges
    
    const result = await dataRetentionService.recoverTeamData(teamId);
    
    res.json({
      success: result.success,
      message: result.message,
      recoveredFrom: result.recoveredFrom
    });
  } catch (error) {
    console.error('Error recovering team data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get data retention policy settings
router.get('/policy', async (req, res) => {
  try {
    res.json({
      success: true,
      policy: dataRetentionService.RETENTION_POLICY
    });
  } catch (error) {
    console.error('Error fetching data retention policy:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get task scheduler metrics (admin only)
router.get('/metrics', rateLimiters.sensitive, async (req, res) => {
  try {
    const metrics = getTaskMetrics();
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error fetching task metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active tasks (admin only)
router.get('/active-tasks', rateLimiters.sensitive, async (req, res) => {
  try {
    const tasks = getActiveTasks();
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching active tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trigger data retention tasks manually (admin only)
router.post('/run-tasks', rateLimiters.sensitive, async (req, res) => {
  try {
    // TODO: Check if user has admin privileges
    
    // Run tasks in the background
    runScheduledTasks().catch(error => {
      console.error('Error running scheduled tasks:', error);
    });
    
    res.json({
      success: true,
      message: 'Data retention tasks scheduled successfully'
    });
  } catch (error) {
    console.error('Error triggering data retention tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Run data retention task directly (not through scheduler) - admin only
router.post('/run-direct', rateLimiters.sensitive, async (req, res) => {
  try {
    // TODO: Check if user has admin privileges
    
    const result = await runDataRetentionTasks();
    
    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error running data retention tasks directly:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance configuration
router.get('/performance-config', rateLimiters.sensitive, async (req, res) => {
  try {
    res.json({
      success: true,
      config: dataRetentionService.PERFORMANCE_CONFIG
    });
  } catch (error) {
    console.error('Error fetching performance configuration:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 