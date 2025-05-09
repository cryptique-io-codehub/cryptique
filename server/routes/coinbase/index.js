const express = require('express');
const router = express.Router();
const coinbaseService = require('../../services/coinbase');
const subscriptionPlans = require('../../config/subscriptionPlans');
const Team = require('../../models/team');
const User = require('../../models/user');
const Payment = require('../../models/payment');
const zohoService = require('../../services/zoho');

/**
 * Create a checkout for a subscription plan
 * POST /api/coinbase/checkout
 */
router.post('/checkout', async (req, res) => {
  try {
    const { teamId, userId, planType, isCQIntelligence, successUrl, cancelUrl } = req.body;
    
    if (!teamId || !userId || !planType) {
      return res.status(400).json({ error: 'Team ID, user ID, and plan type are required' });
    }

    // Validate plan type
    if (!subscriptionPlans[planType]) {
      return res.status(400).json({ 
        error: `Invalid plan type. Available options: ${Object.keys(subscriptionPlans).join(', ')}` 
      });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate amount based on plan
    let amount = subscriptionPlans[planType].price;
    
    // Add CQ Intelligence if requested
    if (isCQIntelligence && planType !== 'cq_intelligence_addon') {
      amount += subscriptionPlans.cq_intelligence_addon.price;
    }

    // For enterprise plan, validate amount is provided since it's custom
    if (planType === 'enterprise' && !req.body.amount) {
      return res.status(400).json({ error: 'Amount is required for enterprise plan' });
    } else if (planType === 'enterprise') {
      amount = req.body.amount;
    }

    // Create checkout
    const checkout = await coinbaseService.createSubscriptionCheckout({
      planName: subscriptionPlans[planType].name,
      planType,
      amount,
      teamId,
      userId,
      isCQIntelligence: !!isCQIntelligence,
      successUrl: successUrl || `${process.env.CLIENT_URL}/settings/billing/success`,
      cancelUrl: cancelUrl || `${process.env.CLIENT_URL}/settings/billing/cancel`
    });

    // Record the payment attempt
    const payment = new Payment({
      teamId,
      transactionId: checkout.id,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: 'crypto',
      planType,
      coinbaseData: {
        checkoutId: checkout.id
      }
    });
    await payment.save();

    return res.status(200).json({ 
      success: true,
      checkout: {
        id: checkout.id,
        url: checkout.hosted_url,
        expiresAt: checkout.expires_at
      }
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return res.status(500).json({ error: 'Failed to create checkout' });
  }
});

/**
 * Process webhook from Coinbase Commerce
 * POST /api/coinbase/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify the webhook signature
    const signature = req.headers['x-cc-webhook-signature'];
    const event = coinbaseService.verifyWebhookSignature(req.body, signature);
    
    if (!event) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Handle different event types
    switch (event.type) {
      case 'charge:confirmed': {
        await handleChargeConfirmed(event.data);
        break;
      }
      case 'charge:failed': {
        await handleChargeFailed(event.data);
        break;
      }
      case 'charge:delayed': {
        await handleChargeDelayed(event.data);
        break;
      }
      case 'charge:pending': {
        await handleChargePending(event.data);
        break;
      }
      default:
        console.log(`Unhandled Coinbase event type: ${event.type}`);
    }

    // Acknowledge the webhook
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
});

/**
 * Handle charge confirmed webhook event
 */
async function handleChargeConfirmed(data) {
  try {
    // Extract metadata
    const { teamId, planType, isCQIntelligence } = data.metadata;
    
    // Find payment record
    const payment = await Payment.findOne({ 
      'coinbaseData.checkoutId': data.id 
    });
    
    if (!payment) {
      console.error('Payment record not found for charge:', data.id);
      return;
    }

    // Update payment status
    payment.status = 'completed';
    payment.coinbaseData.chargeId = data.id;
    payment.coinbaseData.paymentDetails = data;
    payment.transactionId = data.id;
    await payment.save();

    // Update team subscription
    const team = await Team.findById(teamId);
    if (!team) {
      console.error('Team not found for payment:', teamId);
      return;
    }

    // Set subscription details
    const plan = subscriptionPlans[planType];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    team.subscription = {
      plan: planType,
      status: 'active',
      startDate,
      endDate,
      cqIntelligence: !!isCQIntelligence,
      limits: {
        websites: plan.limits?.websites || 0,
        smartContracts: plan.limits?.smartContracts || 0,
        apiCalls: plan.limits?.apiCalls || 0,
        teamMembers: plan.limits?.teamMembers || 1
      }
    };

    await team.save();

    // If team is connected to Zoho, create a deal and update subscription status
    if (team.zohoDetails && team.zohoDetails.accountId) {
      // Create a deal in Zoho
      await zohoService.createDeal({
        name: `${team.name} - ${planType.toUpperCase()} Subscription`,
        accountId: team.zohoDetails.accountId,
        amount: payment.amount,
        stage: 'Closed Won',
        closingDate: new Date(),
        description: `Subscription for ${planType} plan from ${startDate} to ${endDate}`
      });

      // Update subscription status if contact ID exists
      if (team.zohoDetails.contactId) {
        await zohoService.updateSubscriptionStatus(
          team.zohoDetails.contactId,
          {
            status: 'active',
            plan: planType,
            amount: payment.amount,
            startDate,
            endDate
          }
        );
      }
    }
  } catch (error) {
    console.error('Error handling charge confirmed:', error);
  }
}

/**
 * Handle charge failed webhook event
 */
async function handleChargeFailed(data) {
  try {
    // Find payment record
    const payment = await Payment.findOne({ 
      'coinbaseData.checkoutId': data.id 
    });
    
    if (!payment) {
      console.error('Payment record not found for charge:', data.id);
      return;
    }

    // Update payment status
    payment.status = 'failed';
    payment.coinbaseData.chargeId = data.id;
    payment.coinbaseData.paymentDetails = data;
    await payment.save();
  } catch (error) {
    console.error('Error handling charge failed:', error);
  }
}

/**
 * Handle charge delayed webhook event
 */
async function handleChargeDelayed(data) {
  try {
    // Find payment record
    const payment = await Payment.findOne({ 
      'coinbaseData.checkoutId': data.id 
    });
    
    if (!payment) {
      console.error('Payment record not found for charge:', data.id);
      return;
    }

    // Update payment record
    payment.status = 'pending';
    payment.coinbaseData.chargeId = data.id;
    payment.coinbaseData.paymentDetails = data;
    await payment.save();
  } catch (error) {
    console.error('Error handling charge delayed:', error);
  }
}

/**
 * Handle charge pending webhook event
 */
async function handleChargePending(data) {
  try {
    // Find payment record
    const payment = await Payment.findOne({ 
      'coinbaseData.checkoutId': data.id 
    });
    
    if (!payment) {
      console.error('Payment record not found for charge:', data.id);
      return;
    }

    // Update payment record
    payment.coinbaseData.chargeId = data.id;
    payment.coinbaseData.paymentDetails = data;
    await payment.save();
  } catch (error) {
    console.error('Error handling charge pending:', error);
  }
}

/**
 * Get subscription details
 * GET /api/coinbase/subscription/:teamId
 */
router.get('/subscription/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get the latest payment
    const latestPayment = await Payment.findOne(
      { teamId, status: 'completed' },
      {},
      { sort: { 'createdAt': -1 } }
    );

    return res.status(200).json({
      subscription: team.subscription,
      latestPayment: latestPayment ? {
        id: latestPayment._id,
        amount: latestPayment.amount,
        currency: latestPayment.currency,
        status: latestPayment.status,
        planType: latestPayment.planType,
        date: latestPayment.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error getting subscription:', error);
    return res.status(500).json({ error: 'Failed to get subscription details' });
  }
});

module.exports = router; 