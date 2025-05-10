const Team = require('../models/team');
const { SUBSCRIPTION_PLANS } = require('../config/stripe');

/**
 * Track usage of a resource for a team
 * @param {string} teamId - ID of the team
 * @param {string} resourceType - Type of resource: 'websites', 'smartContracts', 'apiCalls', 'teamMembers'
 * @param {number} increment - Amount to increment (default 1)
 * @returns {Promise<Object>} Result with allowed status and limit info
 */
const trackUsage = async (teamId, resourceType, increment = 1) => {
  try {
    // Get team's current usage and limits
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Get current usage
    const currentUsage = team.usage?.[resourceType] || 0;
    
    // Get limit based on subscription plan
    let limit;
    
    // For enterprise plans with custom limits
    if (team.subscription.plan === 'enterprise' && team.subscription.customPlanDetails) {
      limit = team.subscription.customPlanDetails[resourceType] || null; // null means unlimited
    } else {
      // Get standard limit from plan configuration
      const planConfig = SUBSCRIPTION_PLANS[team.subscription.plan.toUpperCase()];
      limit = planConfig?.limits?.[resourceType] || 0;
    }
    
    // Special case for API calls - monthly limits
    if (resourceType === 'apiCalls') {
      const lastReset = team.usage?.lastResetDate || team.createdAt;
      const now = new Date();
      const monthsSinceReset = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                             now.getMonth() - lastReset.getMonth();
      
      if (monthsSinceReset > 0) {
        // Reset counter for new month
        await Team.findByIdAndUpdate(teamId, {
          'usage.apiCalls': increment,
          'usage.lastResetDate': now
        });
        
        return {
          allowed: true,
          currentUsage: increment,
          limit,
          resetPerformed: true
        };
      }
    }
    
    // Calculate new usage
    const newUsage = currentUsage + increment;
    
    // Check if this would exceed the limit
    const allowed = limit === null || newUsage <= limit;
    
    // Update usage counter
    if (increment > 0) {
      await Team.findByIdAndUpdate(teamId, {
        [`usage.${resourceType}`]: newUsage
      });
    }
    
    return {
      allowed,
      currentUsage: newUsage,
      limit,
      remaining: limit === null ? null : limit - newUsage
    };
  } catch (error) {
    console.error(`Error tracking ${resourceType} usage:`, error);
    throw error;
  }
};

/**
 * Reset usage counters for a specific team
 * @param {string} teamId - ID of the team
 * @param {string} resourceType - Type of resource to reset, or null to reset all
 */
const resetUsage = async (teamId, resourceType = null) => {
  try {
    const updateObj = {};
    
    if (resourceType) {
      // Reset specific resource
      updateObj[`usage.${resourceType}`] = 0;
    } else {
      // Reset all usage
      updateObj['usage.websites'] = 0;
      updateObj['usage.smartContracts'] = 0;
      updateObj['usage.apiCalls'] = 0;
      // Don't reset teamMembers as it's based on actual members
      updateObj['usage.lastResetDate'] = new Date();
    }
    
    await Team.findByIdAndUpdate(teamId, updateObj);
    
    return true;
  } catch (error) {
    console.error('Error resetting usage:', error);
    throw error;
  }
};

/**
 * Calculate current team member count
 * @param {string} teamId - ID of the team
 */
const updateTeamMemberCount = async (teamId) => {
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Count members
    const memberCount = team.members.length;
    
    // Update the usage count
    await Team.findByIdAndUpdate(teamId, {
      'usage.teamMembers': memberCount
    });
    
    return {
      currentUsage: memberCount,
      updated: true
    };
  } catch (error) {
    console.error('Error updating team member count:', error);
    throw error;
  }
};

/**
 * Update custom enterprise limits
 * @param {string} teamId - ID of the team
 * @param {Object} limits - Custom limits for the enterprise plan
 */
const updateEnterpriseLimits = async (teamId, limits) => {
  try {
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Check if this is an enterprise plan
    if (team.subscription.plan !== 'enterprise') {
      throw new Error('Custom limits can only be set for enterprise plans');
    }
    
    // Update custom limits
    await Team.findByIdAndUpdate(teamId, {
      'subscription.customPlanDetails': {
        ...team.subscription.customPlanDetails,
        ...limits
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating enterprise limits:', error);
    throw error;
  }
};

/**
 * Get current usage and limits for a team
 * @param {string} teamId - ID of the team
 */
const getUsageReport = async (teamId) => {
  try {
    const team = await Team.findById(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Get plan limits
    let limits = {};
    
    if (team.subscription.plan === 'enterprise' && team.subscription.customPlanDetails) {
      // Enterprise with custom limits
      limits = team.subscription.customPlanDetails;
    } else {
      // Standard plan
      const planConfig = SUBSCRIPTION_PLANS[team.subscription.plan.toUpperCase()];
      limits = planConfig?.limits || {};
    }
    
    // Prepare usage report
    const usageReport = {
      plan: team.subscription.plan,
      planName: SUBSCRIPTION_PLANS[team.subscription.plan.toUpperCase()]?.name || team.subscription.plan,
      status: team.subscription.status,
      resources: {
        websites: {
          usage: team.usage?.websites || 0,
          limit: limits.websites,
          percentage: limits.websites ? Math.round((team.usage?.websites || 0) / limits.websites * 100) : 0
        },
        smartContracts: {
          usage: team.usage?.smartContracts || 0,
          limit: limits.smartContracts,
          percentage: limits.smartContracts ? Math.round((team.usage?.smartContracts || 0) / limits.smartContracts * 100) : 0
        },
        apiCalls: {
          usage: team.usage?.apiCalls || 0,
          limit: limits.apiCalls,
          percentage: limits.apiCalls ? Math.round((team.usage?.apiCalls || 0) / limits.apiCalls * 100) : 0,
          resetsOn: getNextResetDate(team.usage?.lastResetDate || team.createdAt)
        },
        teamMembers: {
          usage: team.usage?.teamMembers || team.members.length,
          limit: limits.teamMembers,
          percentage: limits.teamMembers ? Math.round((team.usage?.teamMembers || team.members.length) / limits.teamMembers * 100) : 0
        }
      }
    };
    
    return usageReport;
  } catch (error) {
    console.error('Error getting usage report:', error);
    throw error;
  }
};

/**
 * Calculate the next reset date for monthly limits
 * @param {Date} lastResetDate - Last reset date
 * @returns {Date} Next reset date
 */
function getNextResetDate(lastResetDate) {
  const nextReset = new Date(lastResetDate);
  nextReset.setMonth(nextReset.getMonth() + 1);
  return nextReset;
}

module.exports = {
  trackUsage,
  resetUsage,
  updateTeamMemberCount,
  updateEnterpriseLimits,
  getUsageReport
}; 