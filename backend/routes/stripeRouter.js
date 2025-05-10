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

    // Log the incoming request for debugging
    console.log('Checkout session request:', { 
      teamId, 
      planType, 
      billingCycle,
      hasSuccessUrl: !!successUrl,
      hasCancelUrl: !!cancelUrl,
      successUrlSample: successUrl ? successUrl.substring(0, 40) + '...' : 'none',
      cancelUrlSample: cancelUrl ? cancelUrl.substring(0, 40) + '...' : 'none'
    });

    // Validate required parameters
    if (!teamId || !planType) {
      return res.status(400).json({ error: 'Missing required parameters: teamId and planType are required' });
    }
    
    // Validate URLs - must be valid and properly encoded
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: 'Missing required parameters: successUrl and cancelUrl are required' });
    }
    
    // Validate URL format
    try {
      // Test if URLs are valid by trying to construct URL objects
      new URL(successUrl);
      new URL(cancelUrl);
    } catch (urlError) {
      console.error('Invalid URL format:', urlError.message);
      return res.status(400).json({ 
        error: 'Invalid URL format. URLs must be properly encoded.',
        details: urlError.message 
      });
    }

    // Normalize the plan type to lowercase for case-insensitive comparison
    const normalizedPlanType = planType.toLowerCase();
    
    // Check if this plan type includes CQ Intelligence add-on
    const includesCQIntelligence = normalizedPlanType.includes('with_cq_intelligence');
    
    // Extract the base plan type by removing the add-on part if present
    let basePlanType = normalizedPlanType;
    if (includesCQIntelligence) {
      basePlanType = normalizedPlanType.replace('_with_cq_intelligence', '');
    }

    console.log('Normalized plan type:', { 
      original: planType,
      normalized: normalizedPlanType,
      base: basePlanType,
      includesAddon: includesCQIntelligence
    });

    // Get the appropriate price ID based on plan type and billing cycle
    let priceId;
    switch (basePlanType) {
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
        console.error(`Invalid plan type: ${planType} (normalized: ${basePlanType})`);
        throw new Error(`Invalid plan type: ${planType}`);
    }

    if (!priceId) {
      throw new Error('Price ID not found for the selected plan');
    }

    // Create a line items array starting with the base plan
    const lineItems = [
      {
        price: priceId,
        quantity: 1,
      }
    ];

    // Add CQ Intelligence add-on if requested
    if (includesCQIntelligence) {
      const addonPriceId = billingCycle === 'annual'
        ? process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL
        : process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE;
        
      if (addonPriceId) {
        lineItems.push({
          price: addonPriceId,
          quantity: 1
        });
      }
    }

    // Log the line items for debugging
    console.log('Creating checkout with line items:', lineItems);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: teamId,
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          teamId,
          billingCycle,
          planType: normalizedPlanType
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
  console.log("Warning: Using deprecated webhook path /api/stripe/webhook. Please update to /api/webhooks/stripe");
  // Forward to the standardized webhook endpoint
  res.redirect(307, '/api/webhooks/stripe');
});

// Get subscription for a team
router.get('/subscription/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    // Find the team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // If no subscription exists, return null
    if (!team.subscription.stripeSubscriptionId) {
      return res.json(null);
    }

    // Get subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      team.subscription.stripeSubscriptionId,
      {
        expand: ['customer', 'items.data.price.product']
      }
    );

    // Get the current plan details
    const currentPlan = subscription.items.data[0].price.product;
    const hasCQIntelligence = subscription.items.data.some(item => 
      item.price.id === process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE || 
      item.price.id === process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL
    );

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: team.subscription.plan,
        hasCQIntelligence,
        billingCycle: team.subscription.billingCycle,
        currentPlan: {
          id: currentPlan.id,
          name: currentPlan.name,
          description: currentPlan.description
        }
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
});

module.exports = router; 