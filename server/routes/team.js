const express = require('express');
const router = express.Router();
const Team = require('../models/team');

// Add new route to check subscription status
router.get('/subscription-status/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }
    
    // Get team with subscription details
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // For free plan, just return active status
    if (team.subscription.plan === 'free') {
      return res.json({ 
        status: 'active',
        plan: 'free',
        inGracePeriod: false
      });
    }
    
    // Grace period calculation for inactive/pastdue/cancelled subscriptions
    const gracePeriodDays = 30; // 30-day grace period
    
    // Check if in grace period
    const isInGracePeriod = checkGracePeriod(team, gracePeriodDays);
    
    const subscriptionInfo = {
      status: team.subscription.status,
      plan: team.subscription.plan,
      inGracePeriod: isInGracePeriod,
      gracePeriod: isInGracePeriod ? {
        endDate: getGracePeriodEndDate(team, gracePeriodDays),
        daysLeft: getDaysLeftInGracePeriod(team, gracePeriodDays)
      } : null
    };
    
    return res.json(subscriptionInfo);
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
});

// Helper function to check if team is within grace period
function checkGracePeriod(team, gracePeriodDays) {
  // Calculate grace period based on subscription end date
  if (!team.subscription.endDate) {
    return false;
  }
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  return new Date() <= gracePeriodEndDate;
}

// Helper function to get grace period end date
function getGracePeriodEndDate(team, gracePeriodDays) {
  if (!team.subscription.endDate) {
    return null;
  }
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  return gracePeriodEndDate;
}

// Helper function to get days left in grace period
function getDaysLeftInGracePeriod(team, gracePeriodDays) {
  if (!team.subscription.endDate) {
    return 0;
  }
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  const today = new Date();
  const daysLeft = Math.ceil((gracePeriodEndDate - today) / (1000 * 60 * 60 * 24));
  
  return Math.max(0, daysLeft);
} 