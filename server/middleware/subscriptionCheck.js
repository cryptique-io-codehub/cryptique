const subscriptionService = require('../services/subscriptionService');

/**
 * Middleware to check if a team has access to a feature based on their subscription
 * @param {string} feature - The feature to check ('websites', 'contracts', 'teamMembers', 'apiCalls', 'cqIntelligence')
 * @param {Function} getValueFn - Function to extract the value to check against from the request
 * @returns {Function} Express middleware
 */
const checkFeatureAccess = (feature, getValueFn) => {
  return async (req, res, next) => {
    try {
      // Extract team ID from request
      const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
      
      if (!teamId) {
        return res.status(400).json({ error: 'Team ID is required' });
      }
      
      // Get the value to check against
      const value = getValueFn ? getValueFn(req) : 1;
      
      // Check if team has access to the feature
      const hasAccess = await subscriptionService.hasFeatureAccess(teamId, feature, value);
      
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Subscription limit reached',
          feature,
          upgrade: true
        });
      }
      
      next();
    } catch (error) {
      console.error(`Error checking ${feature} access:`, error);
      next(error);
    }
  };
};

/**
 * Middleware to check and track API call usage
 */
const trackApiUsage = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    
    if (!teamId) {
      return next(); // Skip tracking if no team ID
    }
    
    // Get current subscription
    const subscription = await subscriptionService.getActiveSubscription(teamId);
    
    if (!subscription) {
      return next(); // Skip tracking if no subscription
    }
    
    // In a real implementation, you would:
    // 1. Increment API call counter in the database
    // 2. Check if the counter exceeds the limit
    // 3. Return 403 if the limit is exceeded
    
    // For now, we'll just check if the team has API call access
    const hasAccess = await subscriptionService.hasFeatureAccess(teamId, 'apiCalls', 1);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'API call limit reached',
        feature: 'apiCalls',
        upgrade: true
      });
    }
    
    next();
  } catch (error) {
    console.error('Error tracking API usage:', error);
    next(error);
  }
};

// Middleware for checking specific feature access
const checkWebsiteAccess = (req, res, next) => {
  // Extract website count from body or params
  const getWebsiteCount = (req) => {
    // Implementation would depend on your API design
    // For example, if this is adding a website, you might get current count + 1
    return 1;
  };
  
  return checkFeatureAccess('websites', getWebsiteCount)(req, res, next);
};

const checkContractAccess = (req, res, next) => {
  // Extract contract count from body or params
  const getContractCount = (req) => {
    // Implementation would depend on your API design
    return 1;
  };
  
  return checkFeatureAccess('contracts', getContractCount)(req, res, next);
};

const checkTeamMemberAccess = (req, res, next) => {
  // Extract member count from body or params
  const getMemberCount = (req) => {
    // Implementation would depend on your API design
    return 1;
  };
  
  return checkFeatureAccess('teamMembers', getMemberCount)(req, res, next);
};

const checkCQIntelligenceAccess = (req, res, next) => {
  return checkFeatureAccess('cqIntelligence')(req, res, next);
};

module.exports = {
  checkFeatureAccess,
  trackApiUsage,
  checkWebsiteAccess,
  checkContractAccess,
  checkTeamMemberAccess,
  checkCQIntelligenceAccess
}; 