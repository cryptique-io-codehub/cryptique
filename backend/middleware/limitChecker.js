const Team = require('../models/team');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Define subscription plans
const SUBSCRIPTION_PLANS = {
  OFFCHAIN: {
    name: 'Off-chain',
    limits: {
      websites: 1,
      smartContracts: 0,
      apiCalls: 0,
      teamMembers: 1
    }
  },
  BASIC: {
    name: 'Basic',
    limits: {
      websites: 2,
      smartContracts: 1,
      apiCalls: 40000,
      teamMembers: 2
    }
  },
  PRO: {
    name: 'Pro',
    limits: {
      websites: 5,
      smartContracts: 5,
      apiCalls: 150000,
      teamMembers: 5
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    limits: {
      websites: 100,
      smartContracts: 100,
      apiCalls: 1000000,
      teamMembers: 100
    }
  }
};

/**
 * Check if the user has reached resource limits based on their subscription plan
 * @param {string} resourceType - Type of resource to check: 'websites', 'smartContracts', 'apiCalls', 'teamMembers'
 * @param {number} increment - Amount to increment (default 1, use 0 to just check without incrementing)
 * @returns {function} Express middleware function
 */
const checkResourceLimit = (resourceType, increment = 1) => {
  return async (req, res, next) => {
    try {
      // Get team from request body, URL parameters, or route parameters
      let teamName = req.body.teamName || req.query.teamName || req.params.teamName;
      
      // If no teamName is explicitly provided, try to get teamId and find the team
      if (!teamName && (req.body.teamId || req.params.teamId)) {
        const teamId = req.body.teamId || req.params.teamId;
        try {
          const team = await Team.findById(teamId);
          if (team) {
            // Found the team by ID, no need to query by name
            req.team = team;
            
            // Get current usage
            const currentUsage = team.usage && team.usage[resourceType] ? team.usage[resourceType] : 0;
            
            // Get limit based on subscription plan
            let limit;
            
            // For enterprise plans with custom limits
            if (team.subscription && team.subscription.plan === 'enterprise' && team.subscription.customPlanDetails) {
              limit = team.subscription.customPlanDetails[resourceType] || null; // null means unlimited
            } else {
              // Get standard limit from plan configuration
              const planKey = team.subscription && team.subscription.plan ? team.subscription.plan.toUpperCase() : 'OFFCHAIN';
              const planConfig = SUBSCRIPTION_PLANS[planKey];
              limit = planConfig?.limits?.[resourceType] || 0;
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
              
              return next();
            } else {
              // Reached the limit - return an appropriate message
              const planLimits = {};
              Object.keys(SUBSCRIPTION_PLANS).forEach(plan => {
                planLimits[plan.toLowerCase()] = SUBSCRIPTION_PLANS[plan].limits[resourceType];
              });
              
              return res.status(403).json({
                error: 'Resource limit reached',
                message: getResourceLimitMessage(resourceType, team.subscription ? team.subscription.plan : 'offchain'),
                resourceType,
                currentUsage,
                limit,
                planLimits,
                upgradeOptions: getUpgradeOptions(team.subscription ? team.subscription.plan : 'offchain', resourceType)
              });
            }
          }
        } catch (err) {
          console.error('Error finding team by ID:', err);
          // Continue to try finding by name if error occurs
        }
      }
      
      // If we got here, we need to find the team by name
      if (!teamName) {
        // For GET requests or routes that don't specify team information,
        // we'll skip the limit check rather than failing
        if (req.method === 'GET' || req.method === 'OPTIONS') {
          console.log('Skipping limit check for GET/OPTIONS request without team info');
          return next();
        }
        
        return res.status(400).json({ error: 'Team information is required' });
      }
      
      // Find the team by name
      const team = await Team.findOne({ name: teamName });
      if (!team) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      // Attach team to request for controllers to use
      req.team = team;
      
      // Get current usage
      const currentUsage = team.usage && team.usage[resourceType] ? team.usage[resourceType] : 0;
      
      // Get limit based on subscription plan
      let limit;
      
      // For enterprise plans with custom limits
      if (team.subscription && team.subscription.plan === 'enterprise' && team.subscription.customPlanDetails) {
        limit = team.subscription.customPlanDetails[resourceType] || null; // null means unlimited
      } else {
        // Get standard limit from plan configuration
        const planKey = team.subscription && team.subscription.plan ? team.subscription.plan.toUpperCase() : 'OFFCHAIN';
        const planConfig = SUBSCRIPTION_PLANS[planKey];
        limit = planConfig?.limits?.[resourceType] || 0;
      }
      
      // Special case for API calls - these are monthly limits
      if (resourceType === 'apiCalls') {
        // Check if we need to reset the counter (new month)
        const lastReset = team.usage && team.usage.lastResetDate ? team.usage.lastResetDate : team.createdAt;
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
          message: getResourceLimitMessage(resourceType, team.subscription ? team.subscription.plan : 'offchain'),
          resourceType,
          currentUsage,
          limit,
          planLimits,
          upgradeOptions: getUpgradeOptions(team.subscription ? team.subscription.plan : 'offchain', resourceType)
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