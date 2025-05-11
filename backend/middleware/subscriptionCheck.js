const Team = require('../models/team');

/**
 * Middleware to check if a team has an active subscription
 * This will be used to protect routes that require an active subscription
 */
const subscriptionCheck = async (req, res, next) => {
  try {
    const teamName = req.body.teamName || req.params.teamName || req.query.teamName;
    
    if (!teamName) {
      return res.status(400).json({ 
        error: 'Subscription check failed', 
        message: 'Team name is required' 
      });
    }
    
    // Find the team
    const team = await Team.findOne({ name: teamName });
    
    if (!team) {
      return res.status(404).json({ 
        error: 'Subscription check failed', 
        message: 'Team not found' 
      });
    }
    
    // Store team in request for later middleware
    req.team = team;
    
    // Check if subscription is active
    const hasActiveSubscription = team.subscription && 
                                 (team.subscription.status === 'active' || 
                                  team.subscription.status === 'trialing');
    
    // Check if subscription is in grace period
    const now = new Date();
    const subscriptionEndDate = team.subscription?.currentPeriodEnd;
    const isInGracePeriod = subscriptionEndDate && now > subscriptionEndDate && 
                          now < new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days grace period
    
    // Determine if the team should be allowed to access the feature
    if (!hasActiveSubscription) {
      // If subscription is not active, check if we're in grace period
      if (isInGracePeriod) {
        // Calculate days left in grace period
        const gracePeriodEndDate = new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000));
        const daysLeft = Math.ceil((gracePeriodEndDate - now) / (24 * 60 * 60 * 1000));
        
        // Allow access but add grace period info to the request
        req.gracePeriod = {
          inGracePeriod: true,
          daysLeft,
          endDate: gracePeriodEndDate,
          subscriptionEndDate
        };
        
        // Continue to the next middleware/route handler
        return next();
      } else {
        // No active subscription and not in grace period - return error
        return res.status(403).json({
          error: 'Subscription required',
          message: 'An active subscription is required to access this feature',
          subscriptionRequired: true,
          subscriptionStatus: team.subscription?.status || 'inactive',
          subscriptionPlan: team.subscription?.plan || 'none'
        });
      }
    }
    
    // If we reach here, the subscription is active
    next();
    
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
};

module.exports = subscriptionCheck; 