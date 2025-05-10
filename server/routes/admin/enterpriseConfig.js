const express = require('express');
const router = express.Router();
const Team = require('../../models/team');
const usageService = require('../../services/usageService');

/**
 * Middleware to check if the user is an admin
 * This is a placeholder - in a production app, you would have proper admin authentication
 */
const isAdmin = (req, res, next) => {
  // For demonstration purposes only, we're just checking a header
  // In a real application, you would verify admin status from a token or other secure method
  const isAdminUser = req.headers['x-admin-key'] === process.env.ADMIN_SECRET_KEY;
  
  if (!isAdminUser) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

/**
 * Get all enterprise teams
 */
router.get('/teams', isAdmin, async (req, res) => {
  try {
    // Find all teams with enterprise plans
    const teams = await Team.find({ 'subscription.plan': 'enterprise' });
    
    res.json({
      count: teams.length,
      teams: teams.map(team => ({
        id: team._id,
        name: team.name,
        owner: team.members.find(m => m.role === 'owner')?.email,
        status: team.subscription.status,
        customLimits: team.subscription.customPlanDetails || {}
      }))
    });
  } catch (error) {
    console.error('Error fetching enterprise teams:', error);
    res.status(500).json({ error: 'Failed to fetch enterprise teams' });
  }
});

/**
 * Get a specific enterprise team
 */
router.get('/teams/:teamId', isAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Find the team
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if this is an enterprise plan
    if (team.subscription.plan !== 'enterprise') {
      return res.status(400).json({ error: 'This is not an enterprise team' });
    }
    
    // Get current usage
    const usageReport = await usageService.getUsageReport(teamId);
    
    res.json({
      team: {
        id: team._id,
        name: team.name,
        members: team.members,
        subscription: team.subscription,
        usage: usageReport
      }
    });
  } catch (error) {
    console.error('Error fetching enterprise team:', error);
    res.status(500).json({ error: 'Failed to fetch enterprise team' });
  }
});

/**
 * Update custom limits for an enterprise team
 */
router.put('/teams/:teamId/limits', isAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limits } = req.body;
    
    if (!limits) {
      return res.status(400).json({ error: 'Limits are required' });
    }
    
    // Find the team
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if this is an enterprise plan
    if (team.subscription.plan !== 'enterprise') {
      return res.status(400).json({ error: 'Custom limits can only be set for enterprise plans' });
    }
    
    // Update custom limits
    await usageService.updateEnterpriseLimits(teamId, limits);
    
    res.json({ 
      success: true, 
      message: 'Enterprise limits updated successfully',
      limits
    });
  } catch (error) {
    console.error('Error updating enterprise limits:', error);
    res.status(500).json({ error: 'Failed to update enterprise limits' });
  }
});

/**
 * Reset usage for a team (admin function)
 */
router.post('/teams/:teamId/reset-usage', isAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { resourceType } = req.body;
    
    // Reset usage
    await usageService.resetUsage(teamId, resourceType);
    
    res.json({ 
      success: true, 
      message: resourceType 
        ? `Usage counter for ${resourceType} reset successfully` 
        : 'All usage counters reset successfully'
    });
  } catch (error) {
    console.error('Error resetting usage:', error);
    res.status(500).json({ error: 'Failed to reset usage counters' });
  }
});

module.exports = router; 