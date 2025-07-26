/**
 * Team Service
 * Business logic for team operations
 */

const Team = require('../models/team');
const User = require('../models/user');

/**
 * Subscription plan limits configuration
 */
const SUBSCRIPTION_PLANS = {
  'offchain': {
    websites: 1,
    smartContracts: 0,
    apiCalls: 0,
    teamMembers: 1
  },
  'basic': {
    websites: 2,
    smartContracts: 1,
    apiCalls: 40000,
    teamMembers: 2
  },
  'pro': {
    websites: 5,
    smartContracts: 5,
    apiCalls: 150000,
    teamMembers: 5
  },
  'enterprise': {
    websites: 100,
    smartContracts: 100,
    apiCalls: 1000000,
    teamMembers: 100
  }
};

/**
 * Get plan limits for a subscription plan
 */
const getPlanLimits = (plan) => {
  return SUBSCRIPTION_PLANS[plan] || SUBSCRIPTION_PLANS['offchain'];
};

/**
 * Get upgrade options for a plan
 */
const getUpgradeOptions = (currentPlan) => {
  const planHierarchy = ['offchain', 'basic', 'pro', 'enterprise'];
  const currentIndex = planHierarchy.indexOf(currentPlan);
  
  if (currentIndex === -1 || currentPlan === 'enterprise') {
    return [];
  }
  
  const nextPlan = planHierarchy[currentIndex + 1];
  
  if (nextPlan) {
    return [{
      plan: nextPlan,
      teamMembers: getPlanLimits(nextPlan).teamMembers,
      message: `Upgrade to ${nextPlan} to add more team members`
    }];
  }
  
  return [];
};

/**
 * Normalize team member roles
 * Ensures owner is admin and converts legacy roles
 */
const normalizeTeamRoles = async (team) => {
  let needsSave = false;
  
  if (!team.user || team.user.length === 0) {
    return team;
  }
  
  // Ensure the owner (first member) is always an admin
  if (team.user[0].role !== 'admin') {
    team.user[0].role = 'admin';
    needsSave = true;
  }
  
  // Normalize all other member roles to either 'admin' or 'user'
  for (let i = 1; i < team.user.length; i++) {
    if (team.user[i].role !== 'admin' && team.user[i].role !== 'user') {
      team.user[i].role = 'user';
      needsSave = true;
    }
  }
  
  if (needsSave) {
    await team.save();
  }
  
  return team;
};

/**
 * Get team members with user details
 */
const getTeamMembersWithDetails = async (teamMembers) => {
  const memberDetails = await Promise.all(
    teamMembers.map(async (member) => {
      const user = await User.findById(member.userId);
      if (!user) return null;
      
      return {
        ...user.toObject(),
        role: member.role === 'admin' ? 'admin' : 'user'
      };
    })
  );
  
  return memberDetails.filter(member => member !== null);
};

/**
 * Check if user can be added to team (subscription limits)
 */
const checkTeamMemberLimit = (team) => {
  const subscriptionPlan = team.subscription?.plan || 'offchain';
  const planLimits = getPlanLimits(subscriptionPlan);
  const currentMemberCount = team.user?.length || 0;
  
  if (currentMemberCount >= planLimits.teamMembers) {
    return {
      canAdd: false,
      error: {
        type: 'Resource limit reached',
        message: `You have reached the maximum number of team members (${planLimits.teamMembers}) allowed on your ${subscriptionPlan} plan.`,
        resourceType: 'teamMembers',
        currentUsage: currentMemberCount,
        limit: planLimits.teamMembers,
        upgradeOptions: getUpgradeOptions(subscriptionPlan)
      }
    };
  }
  
  return { canAdd: true };
};

/**
 * Check if user is already a team member
 */
const isUserTeamMember = (team, userId) => {
  return team.user.some(member => member.userId.equals(userId));
};

/**
 * Add member to team
 */
const addMemberToTeam = async (teamId, userId, role) => {
  await Team.findByIdAndUpdate(
    teamId,
    { $push: { user: { userId, role } } },
    { new: true, runValidators: true }
  );
  
  await User.findByIdAndUpdate(
    userId,
    { $addToSet: { team: teamId } },
    { new: true, runValidators: true }
  );
};

/**
 * Remove member from team
 */
const removeMemberFromTeam = async (team, userId) => {
  const memberIndex = team.user.findIndex(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this team');
  }
  
  if (memberIndex === 0) {
    throw new Error('Cannot remove the team owner');
  }
  
  team.user.splice(memberIndex, 1);
  await team.save();
  
  await User.findByIdAndUpdate(
    userId,
    { $pull: { team: team._id } }
  );
  
  return { memberIndex, userId };
};

/**
 * Update member role
 */
const updateMemberRole = async (team, userId, newRole) => {
  const memberIndex = team.user.findIndex(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this team');
  }
  
  // Cannot change the role of the team owner (first member)
  if (memberIndex === 0) {
    if (newRole === 'user') {
      throw new Error('Cannot change the team owner\'s role. The owner must remain an admin.');
    }
    // If owner is not admin, make them admin
    if (team.user[0].role !== 'admin') {
      team.user[0].role = 'admin';
      await team.save();
    }
    return team.user[0];
  }
  
  // Update the role
  team.user[memberIndex].role = newRole;
  await team.save();
  
  return team.user[memberIndex];
};

/**
 * Check user permissions for team operations
 */
const checkTeamPermissions = (team, userId, requiredRole = 'admin') => {
  const member = team.user.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (!member) {
    return { hasPermission: false, error: 'User is not a team member' };
  }
  
  if (requiredRole === 'admin' && member.role !== 'admin') {
    return { hasPermission: false, error: 'Insufficient permissions. Admin role required.' };
  }
  
  return { hasPermission: true, member };
};

/**
 * Calculate grace period information
 */
const calculateGracePeriod = (team, gracePeriodDays = 30) => {
  if (!team.subscription?.endDate) {
    return { inGracePeriod: false };
  }
  
  const endDate = new Date(team.subscription.endDate);
  const gracePeriodEndDate = new Date(endDate);
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + gracePeriodDays);
  
  const now = new Date();
  const isInGracePeriod = now <= gracePeriodEndDate;
  
  if (!isInGracePeriod) {
    return { inGracePeriod: false };
  }
  
  const daysLeft = Math.ceil((gracePeriodEndDate - now) / (1000 * 60 * 60 * 24));
  
  return {
    inGracePeriod: true,
    endDate: gracePeriodEndDate,
    daysLeft: Math.max(0, daysLeft)
  };
};

module.exports = {
  getPlanLimits,
  getUpgradeOptions,
  normalizeTeamRoles,
  getTeamMembersWithDetails,
  checkTeamMemberLimit,
  isUserTeamMember,
  addMemberToTeam,
  removeMemberFromTeam,
  updateMemberRole,
  checkTeamPermissions,
  calculateGracePeriod
};