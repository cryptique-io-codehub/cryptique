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
    
    // Always use direct access for write operations
    const result = await dataRetentionService.recoverTeamData(teamId);
    
    if (result.success) {
      // Clear cache for this team
      proxyService.clearCache(`/teams/${teamId}`);
      
      res.json({
        success: true,
        message: result.message,
        recoveredFrom: result.recoveredFrom
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        code: 'RECOVERY_FAILED'
      });
    }
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
 * Trigger data retention tasks manually (admin only)
 */
router.post('/run-tasks', rateLimiters.sensitive, async (req, res) => {
  try {
    // Check auth permissions here
    
    // Run tasks in the background
    runScheduledTasks().catch(error => {
      console.error('Error running scheduled tasks:', error);
    });
    
    res.json({
      success: true,
      message: 'Data retention tasks scheduled successfully'
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
    
    const result = await runDataRetentionTasks();
    
    res.json({
      success: true,
      result
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
      config: dataRetentionService.PERFORMANCE_CONFIG
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