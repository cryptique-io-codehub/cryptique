const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Team = require('../models/team');

// Get all subscription plans
router.get('/plans', async (req, res) => {
  try {
    // Fetch all prices from Stripe
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });

    // Create a map of prices by ID for easy lookup
    const priceMap = {};
    prices.data.forEach(price => {
      priceMap[price.id] = price;
    });

    const plans = [
      {
        id: 'offchain',
        name: 'Off-chain',
        monthlyPrice: priceMap[process.env.STRIPE_PRICE_ID_OFFCHAIN]?.unit_amount / 100 || 49,
        annualPrice: priceMap[process.env.STRIPE_PRICE_ID_OFFCHAIN_ANNUAL]?.unit_amount / 100 || 539,
        features: [
          'Off-chain analytics only',
          'Link 1 website',
          'No additional team members'
        ],
        monthlyPriceId: process.env.STRIPE_PRICE_ID_OFFCHAIN,
        annualPriceId: process.env.STRIPE_PRICE_ID_OFFCHAIN_ANNUAL
      },
      {
        id: 'basic',
        name: 'Basic',
        monthlyPrice: priceMap[process.env.STRIPE_PRICE_ID_BASIC]?.unit_amount / 100 || 349,
        annualPrice: priceMap[process.env.STRIPE_PRICE_ID_BASIC_ANNUAL]?.unit_amount / 100 || 3799,
        features: [
          'Full app access',
          'Link up to 2 websites',
          'Link 1 smart contract',
          '40,000 monthly explorer API calls',
          '2 team members'
        ],
        monthlyPriceId: process.env.STRIPE_PRICE_ID_BASIC,
        annualPriceId: process.env.STRIPE_PRICE_ID_BASIC_ANNUAL
      },
      {
        id: 'pro',
        name: 'Professional',
        monthlyPrice: priceMap[process.env.STRIPE_PRICE_ID_PRO]?.unit_amount / 100 || 799,
        annualPrice: priceMap[process.env.STRIPE_PRICE_ID_PRO_ANNUAL]?.unit_amount / 100 || 8599,
        features: [
          'Full app access',
          'Link up to 3 websites',
          'Link up to 3 smart contracts',
          '150,000 monthly explorer API calls',
          '3 team members'
        ],
        monthlyPriceId: process.env.STRIPE_PRICE_ID_PRO,
        annualPriceId: process.env.STRIPE_PRICE_ID_PRO_ANNUAL
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        isCustom: true,
        features: [
          'Custom solution',
          'Unlimited websites',
          'Unlimited smart contracts',
          'Unlimited API calls',
          'Unlimited team members',
          'Dedicated support'
        ]
      }
    ];

    // Add CQ Intelligence as an add-on
    const cqIntelligence = {
      id: 'cq-intelligence',
      name: 'CQ Intelligence',
      description: 'AI-powered analytics and insights to supercharge your decision making',
      monthlyPrice: priceMap[process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE]?.unit_amount / 100 || 299,
      annualPrice: priceMap[process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL]?.unit_amount / 100 || 3199,
      features: [
        'Advanced AI analytics',
        'Predictive insights',
        'Automated reporting'
      ],
      monthlyPriceId: process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE,
      annualPriceId: process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL,
      isAddon: true
    };

    res.json({
      plans,
      addons: [cqIntelligence]
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Create a checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { teamId, planType, successUrl, cancelUrl, billingCycle = 'monthly' } = req.body;

    // Get the appropriate price ID based on plan type and billing cycle
    let priceId;
    switch (planType) {
      case 'offchain':
        priceId = billingCycle === 'annual' 
          ? process.env.STRIPE_PRICE_ID_OFFCHAIN_ANNUAL 
          : process.env.STRIPE_PRICE_ID_OFFCHAIN;
        break;
      case 'basic':
        priceId = billingCycle === 'annual'
          ? process.env.STRIPE_PRICE_ID_BASIC_ANNUAL
          : process.env.STRIPE_PRICE_ID_BASIC;
        break;
      case 'pro':
        priceId = billingCycle === 'annual'
          ? process.env.STRIPE_PRICE_ID_PRO_ANNUAL
          : process.env.STRIPE_PRICE_ID_PRO;
        break;
      case 'enterprise':
        priceId = process.env.STRIPE_PRICE_ID_ENTERPRISE;
        break;
      default:
        throw new Error('Invalid plan type');
    }

    if (!priceId) {
      throw new Error('Price ID not found for the selected plan');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: teamId,
      subscription_data: {
        metadata: {
          teamId,
          billingCycle,
          planType
        }
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create a customer portal session
router.post('/create-portal-session', async (req, res) => {
  try {
    const { teamId, returnUrl } = req.body;

    // Get the customer ID for the team
    const customers = await stripe.customers.list({
      limit: 1,
      metadata: { teamId }
    });

    if (!customers.data.length) {
      return res.status(404).json({ error: 'No customer found for this team' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Handle webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const teamId = subscription.metadata.teamId;
        
        if (!teamId) {
          console.error('No teamId found in subscription metadata');
          return res.status(400).json({ error: 'No teamId found in subscription metadata' });
        }

        // Get the plan type from the price ID
        const priceId = subscription.items.data[0].price.id;
        let planType = 'offchain';
        if (priceId === process.env.STRIPE_PRICE_ID_BASIC || priceId === process.env.STRIPE_PRICE_ID_BASIC_ANNUAL) {
          planType = 'basic';
        } else if (priceId === process.env.STRIPE_PRICE_ID_PRO || priceId === process.env.STRIPE_PRICE_ID_PRO_ANNUAL) {
          planType = 'pro';
        } else if (priceId === process.env.STRIPE_PRICE_ID_ENTERPRISE) {
          planType = 'enterprise';
        }

        // Check if CQ Intelligence is included
        const hasCQIntelligence = subscription.items.data.some(item => 
          item.price.id === process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE || 
          item.price.id === process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL
        );

        // Update team subscription in database
        await Team.findByIdAndUpdate(teamId, {
          'subscription.status': subscription.status,
          'subscription.plan': planType,
          'subscription.stripeCustomerId': subscription.customer,
          'subscription.stripeSubscriptionId': subscription.id,
          'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
          'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
          'subscription.hasCQIntelligence': hasCQIntelligence,
          'subscription.billingCycle': subscription.items.data[0].price.recurring.interval
        });

        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const teamId = subscription.metadata.teamId;
        
        if (!teamId) {
          console.error('No teamId found in subscription metadata');
          return res.status(400).json({ error: 'No teamId found in subscription metadata' });
        }

        // Update team subscription status to canceled
        await Team.findByIdAndUpdate(teamId, {
          'subscription.status': 'canceled',
          'subscription.cancelAtPeriodEnd': true
        });

        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

module.exports = router; 