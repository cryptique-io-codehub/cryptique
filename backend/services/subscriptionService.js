const TeamSubscription = require('../models/teamSubscription');
const SubscriptionPlan = require('../models/subscriptionPlan');
const Team = require('../models/team');
const coinbaseService = require('./coinbaseService');

class SubscriptionService {
  /**
   * Get all available subscription plans
   * @returns {Promise<Array>} - List of subscription plans
   */
  async getAllPlans() {
    return await SubscriptionPlan.find({ isActive: true });
  }

  /**
   * Get a team's current subscription
   * @param {string} teamId - The team ID
   * @returns {Promise<Object>} - The team's subscription
   */
  async getTeamSubscription(teamId) {
    return await TeamSubscription.findOne({ 
      teamId,
      status: { $in: ['active', 'trialing', 'past_due', 'pending'] }
    }).populate('plan').populate('addons');
  }

  /**
   * Create a new subscription for a team
   * @param {string} teamId - The team ID
   * @param {string} planId - The subscription plan ID
   * @param {Array} addonIds - Optional addon plan IDs
   * @param {Object} billingDetails - Billing information
   * @returns {Promise<Object>} - The created subscription and payment URL
   */
  async createSubscription(teamId, planId, addonIds = [], billingDetails = {}) {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new Error('Invalid subscription plan');
    }

    let addons = [];
    let totalPrice = plan.price;

    // Process addons if any
    if (addonIds.length > 0) {
      addons = await SubscriptionPlan.find({
        _id: { $in: addonIds },
        isActive: true
      });

      addons.forEach(addon => {
        totalPrice += addon.price;
      });
    }

    // Create Coinbase charge
    const charge = await coinbaseService.createCharge({
      name: `${team.name} Subscription - ${plan.name}`,
      description: `${plan.description} subscription${addons.length ? ' with addons' : ''}`,
      pricing_type: 'fixed_price',
      local_price: {
        amount: totalPrice.toString(),
        currency: 'USD'
      },
      metadata: {
        teamId: teamId.toString(),
        planId: planId.toString(),
        addonIds: addonIds.join(','),
        subscriptionType: 'monthly'
      },
      redirect_url: `${process.env.CLIENT_URL}/settings/billing/confirmation?status=success`,
      cancel_url: `${process.env.CLIENT_URL}/settings/billing/confirmation?status=canceled`
    });

    // Create subscription record in database
    const subscription = new TeamSubscription({
      teamId,
      plan: planId,
      addons: addonIds,
      status: 'pending',
      coinbaseChargeId: charge.data.id,
      billingDetails
    });

    await subscription.save();

    return {
      subscription,
      paymentUrl: charge.data.hosted_url
    };
  }

  /**
   * Handle webhook events from Coinbase
   * @param {Object} event - The webhook event
   * @returns {Promise<boolean>} - Success indicator
   */
  async handleWebhookEvent(event) {
    const { type, data } = event;
    const chargeId = data.id;

    // Get metadata from the charge
    const metadata = data.metadata || {};
    const { teamId, planId, addonIds } = metadata;

    // Find the subscription in our database
    const subscription = await TeamSubscription.findOne({ coinbaseChargeId: chargeId });
    if (!subscription) {
      console.warn(`No subscription found for charge ID: ${chargeId}`);
      return false;
    }

    switch (type) {
      case 'charge:confirmed': {
        // Payment confirmed, activate subscription
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription

        subscription.status = 'active';
        subscription.startDate = now;
        subscription.endDate = endDate;
        subscription.paymentHistory.push({
          transactionId: chargeId,
          amount: data.pricing.local.amount,
          status: 'completed',
          date: now,
          paymentMethod: 'cryptocurrency'
        });

        await subscription.save();
        return true;
      }

      case 'charge:failed': {
        subscription.status = 'past_due';
        await subscription.save();
        return true;
      }

      case 'charge:delayed': {
        // Payment is in progress but not yet confirmed
        return true;
      }

      case 'charge:pending': {
        // Payment is pending
        return true;
      }

      case 'charge:created': {
        // Charge was just created
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * Cancel a team's subscription
   * @param {string} teamId - The team ID
   * @returns {Promise<boolean>} - Success indicator
   */
  async cancelSubscription(teamId) {
    const subscription = await TeamSubscription.findOne({ 
      teamId,
      status: { $in: ['active', 'trialing', 'past_due'] }
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // If there's an active charge in Coinbase, cancel it
    if (subscription.coinbaseChargeId) {
      try {
        await coinbaseService.cancelCharge(subscription.coinbaseChargeId);
      } catch (error) {
        console.error('Error canceling Coinbase charge:', error);
        // Continue with cancellation in our system even if Coinbase fails
      }
    }

    // Mark as canceled in our system, but retain end date
    subscription.status = 'canceled';
    await subscription.save();

    return true;
  }

  /**
   * Check if a team has exceeded its subscription limits
   * @param {string} teamId - The team ID
   * @returns {Promise<Object>} - Limits status
   */
  async checkSubscriptionLimits(teamId) {
    const subscription = await this.getTeamSubscription(teamId);
    if (!subscription) {
      return { hasSubscription: false };
    }

    const team = await Team.findById(teamId)
      .populate('websites')
      .populate('user.userId');

    const plan = subscription.plan;
    const addons = subscription.addons || [];

    // Check if CQ Intelligence is added
    const hasCQIntelligence = plan.features.hasCQIntelligence || 
      addons.some(addon => addon.name === 'CQ-Intelligence-Addon');

    // Calculate usage
    const websitesCount = team.websites?.length || 0;
    const teamMembersCount = team.user?.length || 0;
    const apiCallsUsed = subscription.apiCallsUsed || 0;

    // Get plan limits
    const maxWebsites = plan.features.maxWebsites;
    const maxTeamMembers = plan.features.maxTeamMembers;
    const maxApiCalls = plan.features.maxApiCalls;
    
    return {
      hasSubscription: true,
      status: subscription.status,
      usage: {
        websites: {
          used: websitesCount,
          limit: maxWebsites,
          exceeded: websitesCount > maxWebsites
        },
        teamMembers: {
          used: teamMembersCount,
          limit: maxTeamMembers,
          exceeded: teamMembersCount > maxTeamMembers
        },
        apiCalls: {
          used: apiCallsUsed,
          limit: maxApiCalls,
          exceeded: maxApiCalls > 0 && apiCallsUsed > maxApiCalls
        },
        features: {
          hasCQIntelligence
        }
      }
    };
  }
}

module.exports = new SubscriptionService(); 