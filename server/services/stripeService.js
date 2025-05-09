const { stripe, STRIPE_PRICE_IDS } = require('../config/stripe');
const mongoose = require('mongoose');
const Team = require('../models/team');
const Subscription = mongoose.model('Subscription');
const Payment = mongoose.model('Payment');

/**
 * Create or get a Stripe customer for a team
 */
const getOrCreateCustomer = async (teamId, email, name) => {
  try {
    // Check if the team already has a Stripe customer
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    if (team.stripeCustomerId) {
      // Return existing customer
      return await stripe.customers.retrieve(team.stripeCustomerId);
    }

    // Create a new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        teamId,
      },
    });

    // Update team with Stripe customer ID
    await Team.findByIdAndUpdate(teamId, {
      stripeCustomerId: customer.id,
    });

    return customer;
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
    throw error;
  }
};

/**
 * Create a subscription checkout session
 */
const createCheckoutSession = async (teamId, planType, successUrl, cancelUrl) => {
  try {
    // Get the price ID for the selected plan
    const priceId = STRIPE_PRICE_IDS[planType];
    if (!priceId) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Get the team
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Get or create customer
    let customerId = team.stripeCustomerId;
    if (!customerId) {
      const customer = await getOrCreateCustomer(
        teamId,
        team.members.find(m => m.role === 'owner')?.email,
        team.name
      );
      customerId = customer.id;
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        teamId,
        planType,
      },
    });

    return session;
  } catch (error) {
    console.error('Error in createCheckoutSession:', error);
    throw error;
  }
};

/**
 * Add CQ Intelligence add-on to a subscription
 */
const addCQIntelligence = async (subscriptionId, teamId) => {
  try {
    const priceId = STRIPE_PRICE_IDS.CQ_INTELLIGENCE;
    if (!priceId) {
      throw new Error('CQ Intelligence price ID not configured');
    }

    // Add the subscription item
    const subscriptionItem = await stripe.subscriptionItems.create({
      subscription: subscriptionId,
      price: priceId,
      quantity: 1,
    });

    // Update the subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        $push: {
          addons: {
            name: 'cq_intelligence',
            stripeSubscriptionItemId: subscriptionItem.id,
            stripePriceId: priceId,
            active: true,
            addedAt: new Date(),
          },
        },
      }
    );

    // Update the team model
    await Team.findByIdAndUpdate(teamId, {
      'subscription.cqIntelligence': true,
    });

    return subscriptionItem;
  } catch (error) {
    console.error('Error in addCQIntelligence:', error);
    throw error;
  }
};

/**
 * Cancel CQ Intelligence add-on
 */
const cancelCQIntelligence = async (subscriptionId, teamId) => {
  try {
    // Get the subscription
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId,
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const cqAddon = subscription.addons.find(
      (addon) => addon.name === 'cq_intelligence' && addon.active
    );

    if (!cqAddon) {
      throw new Error('CQ Intelligence addon not found or already inactive');
    }

    // Delete the subscription item
    await stripe.subscriptionItems.del(cqAddon.stripeSubscriptionItemId);

    // Update the subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId, 'addons._id': cqAddon._id },
      {
        $set: {
          'addons.$.active': false,
        },
      }
    );

    // Update the team model
    await Team.findByIdAndUpdate(teamId, {
      'subscription.cqIntelligence': false,
    });

    return true;
  } catch (error) {
    console.error('Error in cancelCQIntelligence:', error);
    throw error;
  }
};

/**
 * Update subscription when webhook events are received
 */
const handleSubscriptionUpdated = async (subscription) => {
  try {
    const { id, customer, status, current_period_start, current_period_end, cancel_at_period_end } = subscription;

    // Update the subscription record
    const updated = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: id },
      {
        status,
        currentPeriodStart: new Date(current_period_start * 1000),
        currentPeriodEnd: new Date(current_period_end * 1000),
        cancelAtPeriodEnd: cancel_at_period_end,
      },
      { new: true }
    );

    if (!updated) {
      console.log('Subscription not found in database, might be a new one');
      return null;
    }

    // Update the team subscription status
    await Team.findByIdAndUpdate(updated.teamId, {
      'subscription.status': status === 'active' ? 'active' : 'inactive',
      'subscription.startDate': new Date(current_period_start * 1000),
      'subscription.endDate': new Date(current_period_end * 1000),
    });

    return updated;
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
const cancelSubscription = async (subscriptionId) => {
  try {
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
    
    // Update local records
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        status: 'canceled',
        canceledAt: new Date(),
      }
    );

    const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    if (subscription) {
      await Team.findByIdAndUpdate(subscription.teamId, {
        'subscription.status': 'cancelled',
      });
    }

    return canceledSubscription;
  } catch (error) {
    console.error('Error in cancelSubscription:', error);
    throw error;
  }
};

/**
 * Get subscription details
 */
const getSubscription = async (subscriptionId) => {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error in getSubscription:', error);
    throw error;
  }
};

/**
 * Create a portal session for customer self-service
 */
const createPortalSession = async (customerId, returnUrl) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    
    return session;
  } catch (error) {
    console.error('Error in createPortalSession:', error);
    throw error;
  }
};

module.exports = {
  getOrCreateCustomer,
  createCheckoutSession,
  addCQIntelligence,
  cancelCQIntelligence,
  handleSubscriptionUpdated,
  cancelSubscription,
  getSubscription,
  createPortalSession,
}; 