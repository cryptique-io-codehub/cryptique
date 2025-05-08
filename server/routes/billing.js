const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const coinbaseService = require('../services/coinbaseService');
const Team = require('../models/team');
const Subscription = require('../models/Subscription');

// Create a checkout session for subscription
router.post('/checkout', async (req, res) => {
  try {
    const { teamId, planType, hasCQIntelligence } = req.body;
    
    if (!teamId || !planType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkout = await subscriptionService.createCheckoutSession(
      teamId,
      planType,
      hasCQIntelligence || false
    );

    res.json(checkout);
  } catch (error) {
    console.error('Error creating checkout:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout' });
  }
});

// Get subscription plans
router.get('/plans', (req, res) => {
  try {
    // Return subscription plan details
    const plans = {
      offchain: coinbaseService.getSubscriptionPlanDetails('offchain'),
      basic: coinbaseService.getSubscriptionPlanDetails('basic'),
      pro: coinbaseService.getSubscriptionPlanDetails('pro'),
      enterprise: coinbaseService.getSubscriptionPlanDetails('enterprise')
    };

    // Also include CQ Intelligence as add-on
    plans.cqIntelligence = {
      name: 'CQ Intelligence',
      price: 299,
      description: 'Advanced AI-powered intelligence features',
      isAddon: true
    };

    res.json(plans);
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch plans' });
  }
});

// Get team's active subscription
router.get('/subscription/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const subscription = await subscriptionService.getActiveSubscription(teamId);
    
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch subscription' });
  }
});

// Get all team's subscriptions (history)
router.get('/subscriptions/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const subscriptions = await subscriptionService.getTeamSubscriptions(teamId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch subscriptions' });
  }
});

// Update team billing details
router.put('/billing/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { 
      companyName, 
      address, 
      city, 
      zipCode, 
      country, 
      isRegisteredCompany,
      taxId,
      invoiceEmail
    } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Find the team
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Update billing info
    team.billing = {
      ...team.billing,
      companyName,
      address,
      city,
      zipCode,
      country,
      isRegisteredCompany,
      taxId,
      invoiceEmail
    };

    await team.save();

    res.json({ success: true, billing: team.billing });
  } catch (error) {
    console.error('Error updating billing details:', error);
    res.status(500).json({ error: error.message || 'Failed to update billing details' });
  }
});

// Cancel subscription
router.post('/cancel/:subscriptionId', async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    
    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const subscription = await subscriptionService.cancelSubscription(subscriptionId);
    res.json(subscription);
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// Coinbase webhook endpoint for handling payments
// Note: express.raw middleware is now set in index.js to avoid duplication
router.post('/webhook/coinbase', async (req, res) => {
  try {
    // Get the signature from the headers
    const signature = req.headers['x-cc-webhook-signature'];

    // Verify the webhook signature
    const isValidSignature = coinbaseService.verifyWebhookSignature(signature, req.body);
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse the webhook body if it's not already parsed
    let payload;
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      payload = JSON.parse(req.body.toString());
    } else {
      payload = req.body;
    }
    
    // Process the event based on type
    if (payload.event && payload.event.type === 'charge:confirmed') {
      // Handle successful payment
      const chargeId = payload.event.data.id;
      await subscriptionService.processSuccessfulPayment(chargeId);
    }

    // Acknowledge receipt of webhook
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message || 'Failed to process webhook' });
  }
});

module.exports = router; 