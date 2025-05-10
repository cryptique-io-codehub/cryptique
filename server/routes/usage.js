const express = require('express');
const router = express.Router();
const usageService = require('../services/usageService');
const subscriptionCheck = require('../middleware/subscriptionCheck');

/**
 * Get current usage report for a team
 */
router.get('/:teamId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    const usageReport = await usageService.getUsageReport(teamId);
    res.json(usageReport);
  } catch (error) {
    console.error('Error getting usage report:', error);
    res.status(500).json({ error: 'Failed to retrieve usage information' });
  }
});

/**
 * Reset usage counter for a specific resource (admin only)
 */
router.post('/:teamId/reset', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { resourceType } = req.body;
    
    // TODO: Add admin check here
    // This is a placeholder - in production, you'd implement proper admin authorization
    const isAdmin = req.user?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin permissions required' });
    }
    
    await usageService.resetUsage(teamId, resourceType);
    res.json({ success: true, message: 'Usage counters reset successfully' });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ error: 'Failed to reset usage counters' });
  }
});

/**
 * Update enterprise custom limits (admin only)
 */
router.post('/:teamId/enterprise-limits', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limits } = req.body;
    
    // TODO: Add admin check here
    // This is a placeholder - in production, you'd implement proper admin authorization
    const isAdmin = req.user?.role === 'admin';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin permissions required' });
    }
    
    await usageService.updateEnterpriseLimits(teamId, limits);
    res.json({ success: true, message: 'Enterprise limits updated successfully' });
  } catch (error) {
    console.error('Error updating enterprise limits:', error);
    res.status(500).json({ error: 'Failed to update enterprise limits' });
  }
});

/**
 * Manually track API usage (used by services)
 * This endpoint would typically be called by other services, not directly by clients
 */
router.post('/:teamId/track', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { resourceType, increment } = req.body;
    
    if (!resourceType) {
      return res.status(400).json({ error: 'Resource type is required' });
    }
    
    const result = await usageService.trackUsage(
      teamId, 
      resourceType, 
      increment || 1
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track resource usage' });
  }
});

module.exports = router; 