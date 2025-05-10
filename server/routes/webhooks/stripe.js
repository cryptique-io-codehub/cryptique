const express = require('express');
const router = express.Router();
const { stripe } = require('../../config/stripe');
const mongoose = require('mongoose');
const Team = require('../../models/team');
const Payment = mongoose.model('Payment');
const Subscription = mongoose.model('Subscription');
const stripeService = require('../../services/stripeService');

// Raw body parser for Stripe webhooks
router.use(express.raw({ type: 'application/json' }));

router.post('/', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature using the Stripe webhook secret
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        await handleSubscriptionCreated(subscription);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook: ${error.message}`);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session) {
  try {
    // Try to get metadata from both possible locations
    let teamId = session.metadata?.teamId;
    let planType = session.metadata?.planType;
    let billingCycle = session.metadata?.billingCycle || 'monthly';
    
    // If metadata not found at session level, try to get it from other sources
    if (!teamId || !planType) {
      console.log('Session-level metadata missing, checking alternative sources');
      
      // Check client_reference_id as an alternative source for teamId
      if (!teamId && session.client_reference_id) {
        teamId = session.client_reference_id;
        console.log(`Using client_reference_id as teamId: ${teamId}`);
      }
      
      // If we still don't have what we need and there's a subscription ID
      if ((!teamId || !planType) && session.subscription) {
        try {
          // Fetch the subscription to get metadata from there
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (subscription.metadata) {
            teamId = teamId || subscription.metadata.teamId;
            planType = planType || subscription.metadata.planType;
            billingCycle = billingCycle || subscription.metadata.billingCycle || 'monthly';
            console.log('Retrieved metadata from subscription:', { teamId, planType, billingCycle });
          }
          
          // If still no plan type, try to determine from the price
          if (!planType && subscription.items && subscription.items.data && subscription.items.data.length > 0) {
            const price = subscription.items.data[0].price;
            // Compare with known price IDs to determine plan
            const stripePriceIds = require('../../config/stripe').STRIPE_PRICE_IDS;
            for (const [key, value] of Object.entries(stripePriceIds)) {
              if (value === price.id) {
                planType = key.toLowerCase();
                console.log(`Determined plan type from price ID: ${planType}`);
                break;
              }
            }
          }
        } catch (err) {
          console.error('Error fetching subscription metadata:', err);
        }
      }
    }

    console.log('Processing checkout session with metadata:', { 
      teamId, 
      planType, 
      billingCycle,
      subscription: session.subscription,
      customer: session.customer
    });

    if (!teamId || !planType) {
      console.log('Missing teamId or planType in all available metadata sources');
      return;
    }

    // Get or create the subscription
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Check if the subscription already exists
    let subscription = await Subscription.findOne({
      stripeSubscriptionId: subscriptionId
    });

    if (!subscription) {
      // Get the subscription details from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);

      // Create a new subscription record
      subscription = new Subscription({
        teamId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        plan: planType.toLowerCase(),
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        billingCycle: billingCycle,
        paymentMethod: 'card'
      });

      await subscription.save();
    }

    // Get the plan type capitalized for lookup
    const planTypeKey = planType.toUpperCase();

    // Update the team with the subscription details
    await Team.findByIdAndUpdate(teamId, {
      stripeCustomerId: customerId,
      'subscription.plan': planType.toLowerCase(),
      'subscription.status': subscription.status === 'active' ? 'active' : 'inactive',
      'subscription.startDate': new Date(subscription.current_period_start * 1000),
      'subscription.endDate': new Date(subscription.current_period_end * 1000),
      'subscription.billingCycle': billingCycle,
      'subscription.limits': {
        // Set the limits based on the plan
        websites: planTypeKey !== 'ENTERPRISE' ? require('../../config/stripe').SUBSCRIPTION_PLANS[planTypeKey].limits.websites : null,
        smartContracts: planTypeKey !== 'ENTERPRISE' ? require('../../config/stripe').SUBSCRIPTION_PLANS[planTypeKey].limits.smartContracts : null,
        apiCalls: planTypeKey !== 'ENTERPRISE' ? require('../../config/stripe').SUBSCRIPTION_PLANS[planTypeKey].limits.apiCalls : null,
        teamMembers: planTypeKey !== 'ENTERPRISE' ? require('../../config/stripe').SUBSCRIPTION_PLANS[planTypeKey].limits.teamMembers : null
      }
    });

    // Create a payment record
    const payment = new Payment({
      teamId,
      transactionId: `stripe_${session.id}`,
      amount: session.amount_total / 100, // Convert from cents to dollars
      currency: session.currency.toUpperCase(),
      status: 'completed',
      paymentMethod: 'card',
      planType: planType.toLowerCase(),
      billingPeriod: billingCycle,
      stripeData: {
        customerId,
        subscriptionId,
        sessionId: session.id,
        paymentDetails: session
      }
    });

    await payment.save();
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription) {
  try {
    // We already handle this in checkout.session.completed,
    // but this is a fallback in case we need to handle direct API subscription creation
    const customerId = subscription.customer;
    
    // Get the team associated with this customer
    const team = await Team.findOne({ stripeCustomerId: customerId });
    if (!team) {
      console.log(`No team found for Stripe customer ${customerId}`);
      return;
    }

    // Check if we already have a subscription record
    const existingSubscription = await Subscription.findOne({
      stripeSubscriptionId: subscription.id
    });

    if (existingSubscription) {
      // Already handled by checkout.session.completed
      return;
    }

    // Determine the plan type from the price
    const price = subscription.items.data[0].price;
    let planType = 'basic'; // Default fallback

    // Compare with known price IDs to determine plan
    const stripePriceIds = require('../../config/stripe').STRIPE_PRICE_IDS;
    for (const [key, value] of Object.entries(stripePriceIds)) {
      if (value === price.id) {
        planType = key.toLowerCase();
        break;
      }
    }

    // Create a new subscription record
    const newSubscription = new Subscription({
      teamId: team._id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: planType,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      paymentMethod: 'card'
    });

    await newSubscription.save();

    // Update the team
    const planLimits = require('../../config/stripe').SUBSCRIPTION_PLANS[planType.toUpperCase()]?.limits;
    await Team.findByIdAndUpdate(team._id, {
      'subscription.plan': planType,
      'subscription.status': subscription.status === 'active' ? 'active' : 'inactive',
      'subscription.startDate': new Date(subscription.current_period_start * 1000),
      'subscription.endDate': new Date(subscription.current_period_end * 1000),
      'subscription.limits': planLimits || team.subscription.limits
    });
  } catch (error) {
    console.error('Error handling customer.subscription.created:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    await stripeService.handleSubscriptionUpdated(subscription);
  } catch (error) {
    console.error('Error handling customer.subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const subscriptionId = subscription.id;
    
    // Update the subscription record
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        status: 'canceled',
        canceledAt: new Date(),
        endedAt: new Date(subscription.ended_at * 1000)
      }
    );

    // Get the team and update subscription status
    const subscriptionRecord = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    if (subscriptionRecord) {
      await Team.findByIdAndUpdate(subscriptionRecord.teamId, {
        'subscription.status': 'cancelled',
        'subscription.plan': 'free'
      });
    }
  } catch (error) {
    console.error('Error handling customer.subscription.deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    // Create a payment record for this invoice
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // Find the team associated with this customer
    const team = await Team.findOne({ stripeCustomerId: customerId });
    if (!team) {
      console.log(`No team found for Stripe customer ${customerId}`);
      return;
    }

    // Find the subscription to get the plan type
    const subscription = await Subscription.findOne({ stripeSubscriptionId: subscriptionId });
    if (!subscription) {
      console.log(`No subscription found with ID ${subscriptionId}`);
      return;
    }

    // Create a payment record
    const payment = new Payment({
      teamId: team._id,
      transactionId: `stripe_invoice_${invoice.id}`,
      amount: invoice.amount_paid / 100, // Convert from cents to dollars
      currency: invoice.currency.toUpperCase(),
      status: 'completed',
      paymentMethod: 'card',
      planType: subscription.plan,
      billingPeriod: 'monthly', // Assuming monthly billing
      stripeData: {
        customerId,
        subscriptionId,
        invoiceId: invoice.id,
        paymentIntentId: invoice.payment_intent,
        paymentDetails: invoice
      }
    });

    await payment.save();
  } catch (error) {
    console.error('Error handling invoice.payment_succeeded:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    // Find the team associated with this customer
    const team = await Team.findOne({ stripeCustomerId: customerId });
    if (!team) {
      console.log(`No team found for Stripe customer ${customerId}`);
      return;
    }

    // Update the team's subscription status
    await Team.findByIdAndUpdate(team._id, {
      'subscription.status': 'pastdue'
    });

    // Update the subscription record
    if (subscriptionId) {
      await Subscription.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { status: 'past_due' }
      );
    }

    // Create a failed payment record
    const payment = new Payment({
      teamId: team._id,
      transactionId: `stripe_invoice_${invoice.id}`,
      amount: invoice.amount_due / 100, // Convert from cents to dollars
      currency: invoice.currency.toUpperCase(),
      status: 'failed',
      paymentMethod: 'card',
      planType: team.subscription.plan,
      billingPeriod: 'monthly', // Assuming monthly billing
      stripeData: {
        customerId,
        subscriptionId,
        invoiceId: invoice.id,
        paymentIntentId: invoice.payment_intent,
        paymentDetails: invoice
      }
    });

    await payment.save();
  } catch (error) {
    console.error('Error handling invoice.payment_failed:', error);
    throw error;
  }
}

module.exports = router; 