const express = require('express');
const router = express.Router();
const { stripe, SUBSCRIPTION_PLANS, ADDONS } = require('../config/stripe');
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
    const { teamId, planType, successUrl, cancelUrl, billingCycle } = req.body;

    if (!teamId || !planType || !successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const session = await stripeService.createCheckoutSession(
      teamId,
      planType,
      successUrl,
      cancelUrl,
      billingCycle || 'monthly'
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
    const { teamId, subscriptionId, billingCycle } = req.body;

    if (!teamId || !subscriptionId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await stripeService.addCQIntelligence(subscriptionId, teamId, billingCycle || 'monthly');
    res.json({ success: true, result });
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
    res.json({ success: true, result });
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

/**
 * Check checkout session status - used after redirect from Stripe Checkout
 */
router.get('/checkout-status', async (req, res) => {
  try {
    const { session_id } = req.query;
    
    if (!session_id) {
      return res.status(400).json({ 
        success: false,
        message: 'No session ID provided'
      });
    }
    
    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    // If the payment was successful
    if (session.payment_status === 'paid') {
      return res.json({
        success: true,
        message: 'Your subscription was successfully activated!',
        plan: session.metadata.planType,
        billingCycle: session.metadata.billingCycle || 'monthly'
      });
    } else if (session.status === 'complete' && session.payment_status !== 'paid') {
      // For free trials or similar where no payment is required yet
      return res.json({
        success: true,
        message: 'Your subscription is now active!',
        plan: session.metadata.planType,
        billingCycle: session.metadata.billingCycle || 'monthly'
      });
    } else {
      // Something unexpected happened
      return res.json({
        success: false,
        message: 'Your subscription process was not completed. Please try again.',
        status: session.status,
        paymentStatus: session.payment_status
      });
    }
  } catch (error) {
    console.error('Error checking checkout status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify subscription status.' 
    });
  }
});

module.exports = router; 