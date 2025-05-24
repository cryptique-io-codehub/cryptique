const express = require('express');
const router = express.Router();
const dataRetentionService = require('../services/dataRetentionService');
const { 
  runScheduledTasks, 
  runDataRetentionTasks,
  getTaskMetrics,
  getActiveTasks,
  getTaskStatus
} = require('../tasks/scheduledTasks');
const { taskOrchestrator, EXECUTOR_MODE } = require('../services/taskOrchestratorService');
const createRateLimiter = require('../middleware/rateLimiter');
const proxyService = require('../services/proxyService');

// Create rate limiters
const rateLimiters = createRateLimiter();

// Apply authentication middleware (assuming it exists)
// router.use(authMiddleware);

/**
 * Error handler for retention API
 * @param {Error} err - Error object
 * @param {string} operation - Operation being performed
 * @returns {Object} - Standardized error response
 */
function handleError(err, operation) {
  console.error(`Error in retention API (${operation}):`, err);
  
  // Check if it's a circuit breaker error
  if (err.message && err.message.includes('circuit') && err.message.includes('open')) {
    return {
      success: false,
      error: 'Service temporarily unavailable. Please try again later.',
      code: 'SERVICE_UNAVAILABLE',
      status: 503
    };
  }
  
  // Check for timeout errors
  if (err.message && err.message.includes('timeout')) {
    return {
      success: false,
      error: 'Request timed out. The operation may still be processing.',
      code: 'REQUEST_TIMEOUT',
      status: 408
    };
  }
  
  // Check for not found errors
  if (err.message && (err.message.includes('not found') || err.message.includes('Team not found'))) {
    return {
      success: false,
      error: 'Team not found.',
      code: 'NOT_FOUND',
      status: 404
    };
  }
  
  // Default error response
  return {
    success: false,
    error: err.message || 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    status: 500
  };
}

/**
 * Get the data retention status for a team
 */
router.get('/:teamId/status', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId || !teamId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID format',
        code: 'INVALID_PARAMETER'
      });
    }
    
    // Determine if we should use proxy or direct access
    if (proxyService.shouldUseProxy('read')) {
      // Use proxy with circuit breaker pattern
      try {
        const status = await proxyService.teamsClient.get(`/teams/${teamId}/retention-status`);
        
        return res.json({
          success: true,
          ...status,
          policy: {
            gracePeriodDays: dataRetentionService.RETENTION_POLICY.GRACE_PERIOD_DAYS,
            retentionPeriodDays: dataRetentionService.RETENTION_POLICY.RETENTION_PERIOD_DAYS,
            backupRetentionDays: dataRetentionService.RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS
          }
        });
      } catch (proxyError) {
        // If proxy fails, try direct access as fallback
        console.warn(`Proxy request failed for team ${teamId} status, using direct access:`, proxyError.message);
      }
    }
    
    // Direct access
    const status = await dataRetentionService.checkDataRetentionStatus(teamId);
    
    res.json({
      success: true,
      ...status,
      policy: {
        gracePeriodDays: dataRetentionService.RETENTION_POLICY.GRACE_PERIOD_DAYS,
        retentionPeriodDays: dataRetentionService.RETENTION_POLICY.RETENTION_PERIOD_DAYS,
        backupRetentionDays: dataRetentionService.RETENTION_POLICY.DATA_BACKUP_PERIOD_DAYS
      }
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-status');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Recover team data (if within retention period)
 * This would typically be called after subscription renewal
 */
router.post('/:teamId/recover', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId || !teamId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid team ID format',
        code: 'INVALID_PARAMETER'
      });
    }
    
    // Schedule a data recovery task
    const recoveryTask = await taskOrchestrator.scheduleTask(
      'data_recovery',
      { teamId },
      {
        priority: 2, // Higher priority
        impact: 1,  // Low impact
        lockKey: `data_recovery:${teamId}`,
        executorMode: process.env.DATA_RECOVERY_EXECUTOR_MODE || EXECUTOR_MODE.IN_PROCESS
      }
    );
    
    // Clear cache for this team
    proxyService.clearCache(`/teams/${teamId}`);
    
    res.json({
      success: true,
      message: 'Data recovery task scheduled',
      taskId: recoveryTask.taskId,
      status: recoveryTask.status
    });
  } catch (error) {
    const errorResponse = handleError(error, 'recover-team');
    res.status(errorResponse.status).json(errorResponse);
  }
});

// Redirect legacy endpoint to new one
router.get('/status/:teamId', (req, res) => {
  const teamId = req.params.teamId;
  res.redirect(301, `/${teamId}/status`);
});

// Legacy endpoint for recovery (for backward compatibility)
router.post('/recover/:teamId', rateLimiters.sensitive, (req, res) => {
  const teamId = req.params.teamId;
  res.redirect(307, `/${teamId}/recover`);
});

/**
 * Get data retention policy settings
 */
router.get('/policy', async (req, res) => {
  try {
    res.json({
      success: true,
      policy: dataRetentionService.RETENTION_POLICY
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-policy');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Get task scheduler metrics (admin only)
 */
router.get('/metrics', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    const metrics = getTaskMetrics();
    const circuitStatuses = proxyService.getCircuitStatuses();
    
    res.json({
      success: true,
      metrics,
      circuits: circuitStatuses
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-metrics');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Get active tasks (admin only)
 */
router.get('/active-tasks', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    const tasks = getActiveTasks();
    
    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-active-tasks');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Get status of a specific task (admin only)
 */
router.get('/tasks/:taskId', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    const { taskId } = req.params;
    
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required',
        code: 'INVALID_PARAMETER'
      });
    }
    
    const taskStatus = await getTaskStatus(taskId);
    
    if (!taskStatus) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
        code: 'NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      task: taskStatus
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-task-status');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Trigger data retention tasks manually (admin only)
 */
router.post('/run-tasks', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    const { executorMode } = req.body;
    
    // Run tasks via orchestrator
    const result = await runScheduledTasks();
    
    res.json({
      success: true,
      message: 'Data retention tasks scheduled successfully',
      result
    });
  } catch (error) {
    const errorResponse = handleError(error, 'run-tasks');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Run data retention task directly (not through scheduler) - admin only
 */
router.post('/run-direct', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    // Warning: This uses the legacy mode without the orchestrator
    const result = await runDataRetentionTasks();
    
    res.json({
      success: true,
      result,
      warning: 'Running in legacy mode without task orchestration'
    });
  } catch (error) {
    const errorResponse = handleError(error, 'run-direct');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Get performance configuration
 */
router.get('/performance-config', rateLimiters.sensitive, async (req, res) => {
  try {
    res.json({
      success: true,
      config: dataRetentionService.PERFORMANCE_CONFIG,
      orchestratorMetrics: taskOrchestrator.getMetrics()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'get-performance-config');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Reset circuit breakers (admin only)
 */
router.post('/reset-circuits', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    proxyService.resetCircuits();
    
    res.json({
      success: true,
      message: 'Circuit breakers reset successfully',
      circuits: proxyService.getCircuitStatuses()
    });
  } catch (error) {
    const errorResponse = handleError(error, 'reset-circuits');
    res.status(errorResponse.status).json(errorResponse);
  }
});

/**
 * Clear proxy cache (admin only)
 */
router.post('/clear-cache', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    const { pattern } = req.body;
    const clearedCount = proxyService.clearCache(pattern);
    
    res.json({
      success: true,
      message: `Cache cleared successfully (${clearedCount} entries)`,
      count: clearedCount
    });
  } catch (error) {
    const errorResponse = handleError(error, 'clear-cache');
    res.status(errorResponse.status).json(errorResponse);
  }
});

module.exports = router; 