const Team = require('../models/team');
const { SUBSCRIPTION_PLANS } = require('../config/stripe');

/**
 * Check if the user has reached resource limits based on their subscription plan
 * @param {string} resourceType - Type of resource to check: 'websites', 'smartContracts', 'apiCalls', 'teamMembers'
 * @param {number} increment - Amount to increment (default 1, use 0 to just check without incrementing)
 * @returns {function} Express middleware function
 */
const checkResourceLimit = (resourceType, increment = 1) => {
  return async (req, res, next) => {
    try {
      const teamName = req.body.teamName || req.params.teamName;
      
      if (!teamName) {
        return res.status(400).json({ error: 'Team name is required' });
      }
      
      // Find the team
      const team = await Team.findOne({ name: teamName });
      
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      // Store team in request for later middleware
      req.team = team;
      
      // Check subscription status
      if (team.subscription.status !== 'active' && team.subscription.status !== 'trialing') {
        return res.status(403).json({ 
          error: 'Subscription required',
          message: 'An active subscription is required to add more resources' 
        });
      }
      
      // Get current usage
      const currentUsage = team.usage?.[resourceType] || 0;
      
      // Get limit based on subscription plan
      let limit;
      
      // For enterprise plans with custom limits
      if (team.subscription.plan === 'enterprise') {
        limit = null; // null means unlimited
      } else {
        // Get standard limit from plan configuration
        const planType = team.subscription.plan.toUpperCase();
        const planConfig = SUBSCRIPTION_PLANS[planType];
        limit = planConfig?.limits?.[resourceType] || 0;
      }
      
      // If the limit is defined in the subscription, use that
      if (team.subscription.limits && team.subscription.limits[resourceType] !== undefined) {
        limit = team.subscription.limits[resourceType];
      }
      
      // Special case for API calls - these are monthly limits
      if (resourceType === 'apiCalls') {
        // Check if we need to reset the counter (new month)
        const lastReset = team.usage.lastResetDate || team.createdAt;
        const now = new Date();
        const monthsSinceReset = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                                now.getMonth() - lastReset.getMonth();
        
        if (monthsSinceReset > 0) {
          // Reset counter for new month
          await Team.findByIdAndUpdate(team._id, {
            'usage.apiCalls': increment, // Start with the current increment
            'usage.lastResetDate': now
          });
          
          // Continue since we're under the limit with the reset counter
          req.resourceUsageIncremented = increment > 0;
          return next();
        }
      }
      
      // If unlimited (null) or under the limit, allow the operation
      if (limit === null || currentUsage + increment <= limit) {
        // Only update the usage counter if we're actually using the resource
        if (increment > 0) {
          await Team.findByIdAndUpdate(team._id, { 
            [`usage.${resourceType}`]: currentUsage + increment 
          });
          req.resourceUsageIncremented = true;
        }
        
        next();
      } else {
        // Reached the limit - return an appropriate message
        const planLimits = {};
        Object.keys(SUBSCRIPTION_PLANS).forEach(plan => {
          planLimits[plan.toLowerCase()] = SUBSCRIPTION_PLANS[plan].limits[resourceType];
        });
        
        return res.status(403).json({
          error: 'Resource limit reached',
          message: getResourceLimitMessage(resourceType, team.subscription.plan),
          resourceType,
          currentUsage,
          limit,
          planLimits,
          upgradeOptions: getUpgradeOptions(team.subscription.plan, resourceType)
        });
      }
    } catch (error) {
      console.error('Resource limit check error:', error);
      res.status(500).json({ error: 'Failed to check resource limits' });
    }
  };
};

/**
 * Generate a user-friendly message for limit errors
 */
function getResourceLimitMessage(resourceType, currentPlan) {
  const resourceNames = {
    websites: 'websites',
    smartContracts: 'smart contracts',
    apiCalls: 'API calls',
    teamMembers: 'team members'
  };
  
  const resourceName = resourceNames[resourceType] || resourceType;
  return `You have reached the maximum number of ${resourceName} allowed on your ${currentPlan} plan.`;
}

/**
 * Generate upgrade options when limits are reached
 */
function getUpgradeOptions(currentPlan, resourceType) {
  const planHierarchy = ['free', 'offchain', 'basic', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  
  // If already on enterprise or an invalid plan, no upgrade options
  if (currentIndex === -1 || currentPlan === 'enterprise') {
    return [];
  }
  
  // Otherwise, suggest plans with higher limits
  return planHierarchy.slice(currentIndex + 1).map(plan => {
    const planKey = plan.toUpperCase();
    const planDetails = SUBSCRIPTION_PLANS[planKey];
    return {
      plan,
      name: planDetails.name,
      price: planDetails.price,
      limit: planDetails.limits[resourceType]
    };
  });
}

// Specific middleware functions for each resource type
const checkWebsiteLimit = (increment = 1) => checkResourceLimit('websites', increment);
const checkSmartContractLimit = (increment = 1) => checkResourceLimit('smartContracts', increment);
const checkApiCallLimit = (increment = 1) => checkResourceLimit('apiCalls', increment);
const checkTeamMemberLimit = (increment = 1) => checkResourceLimit('teamMembers', increment);

module.exports = {
  checkResourceLimit,
  checkWebsiteLimit,
  checkSmartContractLimit,
  checkApiCallLimit,
  checkTeamMemberLimit
}; 