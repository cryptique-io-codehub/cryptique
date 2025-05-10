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
      // Add metadata at the session level
      metadata: {
        teamId,
        planType: normalizedPlanType,
        billingCycle
      },
      // Keep subscription data metadata for backwards compatibility
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
    
    console.log('Creating portal session for teamId:', teamId);

    // Find the team first
    const team = await Team.findById(teamId);
    if (!team) {
      console.log('Team not found with ID:', teamId);
      return res.status(404).json({ error: 'Team not found' });
    }
    
    console.log('Found team:', { 
      id: team._id, 
      name: team.name, 
      hasCustomerId: !!team.stripeCustomerId,
      customerId: team.stripeCustomerId || 'none'
    });

    // Check if team has a Stripe customer ID
    if (!team.stripeCustomerId) {
      console.log('Team has no Stripe customer ID:', teamId);
      
      // Try to retrieve Stripe customer ID through alternative methods
      const subscription = team.subscription || {};
      if (subscription.stripeSubscriptionId) {
        try {
          // Try to get customer ID from the subscription
          const subscriptionData = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
          if (subscriptionData && subscriptionData.customer) {
            console.log('Found customer ID from subscription:', subscriptionData.customer);
            
            // Update the team with the customer ID for future use
            team.stripeCustomerId = subscriptionData.customer;
            await team.save();
            
            // Now create the session with this customer ID
            const session = await stripe.billingPortal.sessions.create({
              customer: subscriptionData.customer,
              return_url: returnUrl,
            });
            
            return res.json({ url: session.url });
          }
        } catch (subscriptionError) {
          console.error('Error retrieving subscription:', subscriptionError);
        }
      }
      
      return res.status(404).json({ error: 'No customer found for this team' });
    }

    // Create the portal session with the customer ID
    const session = await stripe.billingPortal.sessions.create({
      customer: team.stripeCustomerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Create a customer portal session using a subscription ID
router.post('/create-portal-session-by-subscription', async (req, res) => {
  try {
    const { subscriptionId, returnUrl } = req.body;
    
    console.log('Creating portal session using subscription ID:', subscriptionId);

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    // Get the subscription to find the customer
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (!subscription) {
      console.log('Subscription not found:', subscriptionId);
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const customerId = subscription.customer;
    console.log('Found customer ID from subscription:', customerId);

    // Create the portal session with this customer ID
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session from subscription:', error);
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

    // Ensure dates are properly formatted
    const currentPeriodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start * 1000) 
      : new Date();
      
    const currentPeriodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default to 30 days from now

    // Log date information for debugging
    console.log('Subscription dates:', { 
      rawStart: subscription.current_period_start,
      rawEnd: subscription.current_period_end,
      formattedStart: currentPeriodStart.toISOString(),
      formattedEnd: currentPeriodEnd.toISOString()
    });

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
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

// Add this route to retroactively sync subscriptions
router.post('/sync-subscriptions', async (req, res) => {
  try {
    // This is an admin-only route, so add authentication as needed
    // For example: if (req.user.role !== 'admin') return res.status(403).json({error: 'Unauthorized'});
    
    // Get all teams that might have subscription issues
    const teams = await Team.find({
      $or: [
        { stripeCustomerId: { $exists: true, $ne: null } },
        { 'subscription.stripeSubscriptionId': { $exists: true, $ne: null } }
      ]
    });
    
    console.log(`Found ${teams.length} teams with potential subscription data`);
    
    const results = {
      success: [],
      noCustomer: [],
      noSubscription: [],
      errors: []
    };
    
    // Process each team
    for (const team of teams) {
      try {
        // Skip teams with no Stripe customer ID
        if (!team.stripeCustomerId) {
          results.noCustomer.push(team._id.toString());
          continue;
        }
        
        console.log(`Processing team ${team._id} with Stripe customer ${team.stripeCustomerId}`);
        
        // Get all subscriptions for the customer
        const subscriptions = await stripe.subscriptions.list({
          customer: team.stripeCustomerId,
          status: 'all' // Include active, past_due, canceled, etc.
        });
        
        if (!subscriptions.data.length) {
          results.noSubscription.push(team._id.toString());
          continue;
        }
        
        // Use the most recent active or past_due subscription
        const activeSubscription = subscriptions.data.find(sub => 
          ['active', 'past_due', 'trialing'].includes(sub.status)
        ) || subscriptions.data[0];
        
        // Get details for logging and debugging
        const subDetails = {
          id: activeSubscription.id,
          status: activeSubscription.status,
          product: activeSubscription.items.data[0]?.price?.product,
          priceId: activeSubscription.items.data[0]?.price?.id,
          interval: activeSubscription.items.data[0]?.plan?.interval
        };
        
        console.log(`Found subscription for team ${team._id}:`, subDetails);
        
        // Determine plan type from subscription items
        let planType = team.subscription.plan || 'basic'; // Default to current or basic
        const billingCycle = activeSubscription.items.data[0]?.plan?.interval === 'year' ? 'annual' : 'monthly';
        
        // Try to determine the plan from price id or product
        const priceId = activeSubscription.items.data[0]?.price?.id;
        if (priceId) {
          if (priceId.includes('pro')) planType = 'pro';
          else if (priceId.includes('enterprise')) planType = 'enterprise';
          else if (priceId.includes('offchain')) planType = 'offchain';
        }
        
        // Update the team with the subscription details
        await Team.findByIdAndUpdate(team._id, {
          stripeCustomerId: team.stripeCustomerId,
          'subscription.stripeSubscriptionId': activeSubscription.id,
          'subscription.plan': planType.toLowerCase(),
          'subscription.status': activeSubscription.status === 'active' ? 'active' : 
                                activeSubscription.status === 'past_due' ? 'pastdue' : 
                                activeSubscription.status === 'canceled' ? 'cancelled' : 'inactive',
          'subscription.billingCycle': billingCycle
        });
        
        console.log(`Updated team ${team._id} with subscription ${activeSubscription.id}`);
        
        results.success.push({
          teamId: team._id.toString(),
          subscriptionId: activeSubscription.id,
          status: activeSubscription.status,
          planType
        });
      } catch (teamError) {
        console.error(`Error processing team ${team._id}:`, teamError);
        results.errors.push({
          teamId: team._id.toString(),
          error: teamError.message
        });
      }
    }
    
    res.json({
      message: `Processed ${teams.length} teams`,
      results
    });
  } catch (error) {
    console.error('Error syncing subscriptions:', error);
    res.status(500).json({ 
      error: 'Failed to sync subscriptions', 
      message: error.message 
    });
  }
});

module.exports = router; 