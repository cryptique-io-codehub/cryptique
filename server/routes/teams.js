const express = require('express');
const router = express.Router();
const subscriptionCheck = require('../middleware/subscriptionCheck');
const { checkTeamMemberLimit } = require('../middleware/limitChecker');
const usageService = require('../services/usageService');
const Team = require('../models/team');

/**
 * Get team details including members
 */
router.get('/:teamId', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

/**
 * Add a member to the team
 * Uses checkTeamMemberLimit middleware to enforce subscription limits
 */
router.post('/:teamId/members', subscriptionCheck, checkTeamMemberLimit(), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { email, role = 'member' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // In a real application, you would validate the email, check if the user exists, etc.
    // For demonstration purposes, we'll just add the member to the team
    
    // Add the member to the team
    const team = await Team.findById(teamId);
    
    // Check if the member is already in the team
    const existingMember = team.members.find(member => member.email === email);
    if (existingMember) {
      return res.status(400).json({ error: 'Member already exists in the team' });
    }
    
    // Add the member
    team.members.push({
      email,
      role,
      joinedAt: new Date()
    });
    
    // Save the team
    await team.save();
    
    // Update team member count in usage
    await usageService.updateTeamMemberCount(teamId);
    
    res.status(201).json({ 
      success: true, 
      message: 'Team member added successfully',
      member: {
        email,
        role,
        joinedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

/**
 * Remove a member from the team
 * When a member is removed, we need to update the team member count
 */
router.delete('/:teamId/members/:email', subscriptionCheck, async (req, res) => {
  try {
    const { teamId, email } = req.params;
    
    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if the member exists
    const memberIndex = team.members.findIndex(member => member.email === email);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Don't allow removing the owner
    if (team.members[memberIndex].role === 'owner') {
      return res.status(400).json({ error: 'Cannot remove the team owner' });
    }
    
    // Remove the member
    team.members.splice(memberIndex, 1);
    
    // Save the team
    await team.save();
    
    // Update team member count in usage
    await usageService.updateTeamMemberCount(teamId);
    
    res.json({ 
      success: true, 
      message: 'Team member removed successfully' 
    });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ error: 'Failed to remove team member' });
  }
});

/**
 * Get usage report for a team
 */
router.get('/:teamId/usage', subscriptionCheck, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const usageReport = await usageService.getUsageReport(teamId);
    
    res.json(usageReport);
  } catch (error) {
    console.error('Error fetching usage report:', error);
    res.status(500).json({ error: 'Failed to fetch usage report' });
  }
});

module.exports = router; 