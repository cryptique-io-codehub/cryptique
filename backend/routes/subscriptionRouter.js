const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');
const coinbaseService = require('../services/coinbaseService');
const { isAuthenticated } = require('../middleware/auth');

// Get all available subscription plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await subscriptionService.getAllPlans();
    res.json({ success: true, plans });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription plans' });
  }
});

// Get team subscription details
router.get('/team/:teamId', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    const subscription = await subscriptionService.getTeamSubscription(teamId);
    
    if (!subscription) {
      return res.json({ success: true, hasSubscription: false });
    }
    
    res.json({ success: true, subscription, hasSubscription: true });
  } catch (error) {
    console.error('Error fetching team subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team subscription' });
  }
});

// Create a new subscription
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { teamId, planId, addonIds, billingDetails } = req.body;
    
    if (!teamId || !planId) {
      return res.status(400).json({ success: false, error: 'Team ID and plan ID are required' });
    }
    
    const result = await subscriptionService.createSubscription(
      teamId, 
      planId,
      addonIds || [],
      billingDetails || {}
    );
    
    res.json({ 
      success: true, 
      subscription: result.subscription,
      paymentUrl: result.paymentUrl
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create subscription' });
  }
});

// Cancel a subscription
router.post('/cancel', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ success: false, error: 'Team ID is required' });
    }
    
    await subscriptionService.cancelSubscription(teamId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to cancel subscription' });
  }
});

// Check subscription limits
router.get('/limits/:teamId', isAuthenticated, async (req, res) => {
  try {
    const { teamId } = req.params;
    const limits = await subscriptionService.checkSubscriptionLimits(teamId);
    res.json({ success: true, ...limits });
  } catch (error) {
    console.error('Error checking subscription limits:', error);
    res.status(500).json({ success: false, error: 'Failed to check subscription limits' });
  }
});

// Coinbase webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-cc-webhook-signature'];
    const rawBody = req.body.toString();
    
    // Verify the webhook signature
    if (!coinbaseService.verifyWebhookSignature(rawBody, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }
    
    const event = JSON.parse(rawBody);
    await subscriptionService.handleWebhookEvent(event);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ success: false, error: 'Failed to process webhook' });
  }
});

module.exports = router; 