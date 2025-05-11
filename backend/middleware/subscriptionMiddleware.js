const Team = require('../models/team');

// Import subscription plans from server config
// We'll define a local copy in case the import fails
let SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    limits: {
      websites: 1,
      smartContracts: 0,
      apiCalls: 1000,
      teamMembers: 1
    }
  },
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
      websites: 10, // Default values, can be customized
      smartContracts: 10,
      apiCalls: 500000,
      teamMembers: 10
    }
  }
};

// Try to import the plans from the server config
try {
  const { SUBSCRIPTION_PLANS: importedPlans } = require('../../server/config/stripe');
  if (importedPlans) {
    SUBSCRIPTION_PLANS = importedPlans;
    console.log('Imported subscription plans from server config');
  }
} catch (error) {
  console.warn('Using fallback subscription plan configuration');
}

/**
 * Middleware to check subscription status
 * This adds the subscription status and team info to the request object
 */
exports.checkSubscription = async (req, res, next) => {
  try {
    // Get team information from request
    let teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    const teamName = req.params.teamName || req.body.teamName || req.query.teamName;
    
    // If no teamId but we have teamName, try to find by name
    if (!teamId && teamName) {
      const team = await Team.findOne({ name: teamName });
      if (team) {
        teamId = team._id;
      }
    }
    
    // If still no teamId, check if the user has a default team
    if (!teamId && req.userId) {
      const user = await require('../models/user').findById(req.userId);
      if (user && user.currentTeam) {
        teamId = user.currentTeam;
      }
    }
    
    // If we still don't have a team ID, we can't proceed with the check
    if (!teamId) {
      return res.status(400).json({ 
        error: 'Missing team information',
        message: 'Team ID or name is required to perform this action'
      });
    }
    
    // Get the team with their subscription info
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ 
        error: 'Team not found',
        message: 'The specified team could not be found'
      });
    }
    
    // Attach team to request for later use
    req.team = team;
    
    // Set a default plan if none exists
    if (!team.subscription || !team.subscription.plan) {
      team.subscription = {
        plan: 'free',
        status: 'active'
      };
    }
    
    // Ensure usage tracking is initialized
    if (!team.usage) {
      team.usage = {
        websites: 0,
        smartContracts: 0,
        apiCalls: 0,
        teamMembers: 1  // Default to 1 (the team creator)
      };
    }
    
    // Get plan limits - defaults to free if plan not found
    const planKey = (team.subscription.plan || 'free').toUpperCase();
    const planConfig = SUBSCRIPTION_PLANS[planKey] || SUBSCRIPTION_PLANS.FREE;
    
    // For enterprise plans with custom limits, use those instead
    const limits = {};
    if (planKey === 'ENTERPRISE' && team.subscription.customLimits) {
      // Merge custom limits with defaults
      Object.assign(limits, planConfig.limits, team.subscription.customLimits);
    } else {
      Object.assign(limits, planConfig.limits);
    }
    
    // Attach subscription and limits to request
    req.subscription = team.subscription;
    req.subscriptionLimits = limits;
    req.planConfig = planConfig;
    
    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    return res.status(500).json({ 
      error: 'Subscription check failed',
      message: 'An error occurred while checking your subscription'
    });
  }
};

/**
 * Check if the team has reached their resource limit
 * @param {string} resourceType - Type of resource to check: 'websites', 'smartContracts', 'apiCalls', 'teamMembers'
 */
exports.checkResourceLimit = (resourceType) => {
  return async (req, res, next) => {
    try {
      // This middleware should be used after checkSubscription
      if (!req.team || !req.subscriptionLimits) {
        return res.status(400).json({
          error: 'Missing subscription information',
          message: 'Please make sure to use the checkSubscription middleware first'
        });
      }
      
      // Skip limit check for GET requests (only apply to resource creation/modification)
      if (req.method === 'GET') {
        return next();
      }
      
      const team = req.team;
      const limits = req.subscriptionLimits;
      
      // Get current usage
      const usage = team.usage || {};
      const currentUsage = usage[resourceType] || 0;
      
      // Get the limit for this resource
      const limit = limits[resourceType];
      
      // If resource is unlimited (null) or usage is under the limit, allow it
      if (limit === null || currentUsage < limit) {
        next();
      } else {
        // User has reached their limit, return an error
        const planName = (team.subscription.plan || 'free').toUpperCase();
        const currentPlanName = SUBSCRIPTION_PLANS[planName]?.name || 'Free';
        
        // Get upgrade options
        const upgradeOptions = getUpgradeOptions(team.subscription.plan, resourceType);
        
        return res.status(403).json({
          error: 'Resource limit reached',
          message: `You have reached the maximum number of ${resourceType} (${limit}) allowed on your ${currentPlanName} plan.`,
          resourceType,
          currentUsage,
          limit,
          upgradeOptions
        });
      }
    } catch (error) {
      console.error('Resource limit check error:', error);
      return res.status(500).json({
        error: 'Resource limit check failed',
        message: 'An error occurred while checking resource limits'
      });
    }
  };
};

/**
 * Generate upgrade options for the current plan
 * @param {string} currentPlan - Current subscription plan
 * @param {string} resourceType - Resource type being checked
 * @returns {Array} - Array of upgrade options with their limits
 */
function getUpgradeOptions(currentPlan, resourceType) {
  const planHierarchy = ['free', 'offchain', 'basic', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan.toLowerCase());
  
  // If already on enterprise or invalid plan, no upgrade options
  if (currentIndex === -1 || currentPlan.toLowerCase() === 'enterprise') {
    return [];
  }
  
  // Return next plans in the hierarchy with their limits
  return planHierarchy
    .slice(currentIndex + 1)
    .map(plan => {
      const planKey = plan.toUpperCase();
      const planConfig = SUBSCRIPTION_PLANS[planKey];
      
      if (!planConfig) return null;
      
      return {
        plan,
        name: planConfig.name,
        price: planConfig.price,
        limit: planConfig.limits[resourceType]
      };
    })
    .filter(Boolean); // Remove any null values
}

// Create specific middleware for each resource type
exports.checkWebsiteLimit = exports.checkResourceLimit('websites');
exports.checkSmartContractLimit = exports.checkResourceLimit('smartContracts');
exports.checkApiCallLimit = exports.checkResourceLimit('apiCalls');
exports.checkTeamMemberLimit = exports.checkResourceLimit('teamMembers'); 