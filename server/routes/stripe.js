const express = require('express');
const router = express.Router();
const { SUBSCRIPTION_PLANS, ADDONS } = require('../config/stripe');
const stripeService = require('../services/stripeService');
const Team = require('../models/team');
const mongoose = require('mongoose');
const Subscription = mongoose.model('Subscription');

/**
 * Get available subscription plans
 */
router.get('/plans', (req, res) => {
  try {
    res.json({
      plans: SUBSCRIPTION_PLANS,
      addons: ADDONS
    });
  } catch (error) {
    console.error('Error getting plans:', error);
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

/**
 * Create checkout session for a new subscription
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { teamId, planType, successUrl, cancelUrl } = req.body;

    if (!teamId || !planType || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const session = await stripeService.createCheckoutSession(
      teamId,
      planType,
      successUrl,
      cancelUrl
    );

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * Add CQ Intelligence add-on to a subscription
 */
router.post('/add-cq-intelligence', async (req, res) => {
  try {
    const { teamId, subscriptionId } = req.body;

    if (!teamId || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const subscriptionItem = await stripeService.addCQIntelligence(subscriptionId, teamId);
    res.json({ success: true, subscriptionItem });
  } catch (error) {
    console.error('Error adding CQ Intelligence:', error);
    res.status(500).json({ error: 'Failed to add CQ Intelligence' });
  }
});

/**
 * Cancel CQ Intelligence add-on
 */
router.post('/cancel-cq-intelligence', async (req, res) => {
  try {
    const { teamId, subscriptionId } = req.body;

    if (!teamId || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await stripeService.cancelCQIntelligence(subscriptionId, teamId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling CQ Intelligence:', error);
    res.status(500).json({ error: 'Failed to cancel CQ Intelligence' });
  }
});

/**
 * Get current subscription for a team
 */
router.get('/subscription/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const subscription = await Subscription.findOne({ teamId });
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found for this team' });
    }

    // Get the latest Stripe subscription data
    const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
    
    res.json({ 
      subscription,
      stripeSubscription 
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ error: 'Failed to get subscription details' });
  }
});

/**
 * Cancel a subscription
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Missing subscription ID' });
    }

    const canceledSubscription = await stripeService.cancelSubscription(subscriptionId);
    res.json({ success: true, canceledSubscription });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Create a customer portal session
 */
router.post('/create-portal-session', async (req, res) => {
  try {
    const { teamId, returnUrl } = req.body;

    if (!teamId || !returnUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Get the team to find the customer ID
    const team = await Team.findById(teamId);
    if (!team || !team.stripeCustomerId) {
      return res.status(404).json({ error: 'Team not found or no Stripe customer ID associated' });
    }

    const session = await stripeService.createPortalSession(team.stripeCustomerId, returnUrl);
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create customer portal session' });
  }
});

module.exports = router; 