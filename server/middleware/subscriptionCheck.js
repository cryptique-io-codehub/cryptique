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
    
    // Grace period calculation for inactive/pastdue/cancelled subscriptions
    const gracePeriodDays = 30; // 30-day grace period
    const isInGracePeriod = checkGracePeriod(team, gracePeriodDays);
    
    // Check subscription status for paid plans
    if (team.subscription.status !== 'active') {
      // During grace period:
      // 1. Allow tracking/collection of analytics data (specific endpoints)
      // 2. Block viewing of analytics data for already integrated websites/smart contracts
      // 3. Block adding new websites or smart contracts
      if (isInGracePeriod) {
        // List of endpoints that should still work during grace period for tracking purposes
        const trackingEndpoints = [
          '/sdk/track', 
          '/sdk/pageview',
          '/sdk/event',
          '/sdk/session',
          '/sdk/wallet'
        ];
        
        // Check if the current request is for tracking analytics (these should still work)
        const isTrackingEndpoint = trackingEndpoints.some(endpoint => 
          req.path.toLowerCase().includes(endpoint.toLowerCase())
        );
        
        // Allow tracking endpoints to continue working
        if (isTrackingEndpoint) {
          req.inGracePeriod = true;
          req.gracePeriodEndDate = getGracePeriodEndDate(team, gracePeriodDays);
          req.team = team;
          req.subscription = team.subscription;
          return next();
        }
        
        // Block requests to add new websites or smart contracts
        if (
          (req.method === 'POST' && 
          (req.path.includes('/website') || req.path.includes('/smartcontract'))) || 
          (req.method === 'POST' && req.path.includes('/contract'))
        ) {
          return res.status(403).json({ 
            error: 'Subscription required',
            message: 'Your subscription is in grace period. You cannot add new websites or smart contracts until you renew your subscription.',
            subscriptionStatus: team.subscription.status,
            gracePeriod: {
              endDate: getGracePeriodEndDate(team, gracePeriodDays),
              daysLeft: getDaysLeftInGracePeriod(team, gracePeriodDays)
            }
          });
        }
        
        // Block requests to view analytics data
        if (
          (req.method === 'GET' && 
          (req.path.includes('/analytics') || 
           req.path.includes('/dashboard') ||
           req.path.includes('/stats') ||
           req.path.includes('/intelligence')))
        ) {
          return res.status(403).json({ 
            error: 'Subscription required',
            message: 'Your subscription is in grace period. Analytics viewing is disabled until you renew your subscription.',
            subscriptionStatus: team.subscription.status,
            gracePeriod: {
              endDate: getGracePeriodEndDate(team, gracePeriodDays),
              daysLeft: getDaysLeftInGracePeriod(team, gracePeriodDays)
            }
          });
        }
        
        // For other GET requests during grace period, still allow access (non-analytics related)
        if (req.method === 'GET') {
          req.inGracePeriod = true;
          req.gracePeriodEndDate = getGracePeriodEndDate(team, gracePeriodDays);
          req.team = team;
          req.subscription = team.subscription;
          return next();
        }
      }
      
      // For requests outside grace period or non-GET requests in grace period, block access
      return res.status(403).json({ 
        error: 'Subscription required',
        message: isInGracePeriod 
          ? 'Your subscription is not active. You can view limited data during the grace period, but cannot make changes or view analytics. Please update your payment information.'
          : 'Your subscription has expired. Please renew your subscription to regain access.',
        subscriptionStatus: team.subscription.status,
        gracePeriod: isInGracePeriod ? {
          endDate: getGracePeriodEndDate(team, gracePeriodDays),
          daysLeft: getDaysLeftInGracePeriod(team, gracePeriodDays)
        } : null
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

/**
 * Check if the team is within the grace period
 * @param {Object} team - The team object
 * @param {number} gracePeriodDays - Number of days in grace period
 * @returns {boolean} - Whether the team is in grace period
 */
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

/**
 * Get the grace period end date
 * @param {Object} team - The team object
 * @param {number} gracePeriodDays - Number of days in grace period
 * @returns {Date} - Grace period end date
 */
function getGracePeriodEndDate(team, gracePeriodDays) {
  if (!team.subscription.endDate) {
    return null;
  }
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  return gracePeriodEndDate;
}

/**
 * Get the number of days left in grace period
 * @param {Object} team - The team object
 * @param {number} gracePeriodDays - Number of days in grace period
 * @returns {number} - Days left in grace period
 */
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

module.exports = subscriptionCheck; 