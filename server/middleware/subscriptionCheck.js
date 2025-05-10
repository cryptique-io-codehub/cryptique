const Team = require('../models/team');

/**
 * Middleware to check if a user's team has an active subscription
 * This middleware should be used after authentication middleware that attaches the user to the request
 */
const subscriptionCheck = async (req, res, next) => {
  try {
    // Get the teamId from request
    // This assumes your authentication middleware has attached the user to the request
    // and that there's a teamId in the request params or body
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }
    
    // Get team with subscription details
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // For free plan, just continue
    if (team.subscription.plan === 'free') {
      req.team = team;
      return next();
    }
    
    // Check subscription status for paid plans
    if (team.subscription.status !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription required',
        message: 'Your subscription is not active. Please update your payment information.',
        subscriptionStatus: team.subscription.status
      });
    }
    
    // Attach team and subscription info to request
    req.team = team;
    req.subscription = team.subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to validate subscription' });
  }
};

module.exports = subscriptionCheck; 