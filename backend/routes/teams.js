// ... existing imports and routes ...

// Add a route to get subscription limits and usage data for a team
router.get('/:teamName/limits', async (req, res) => {
  try {
    const { teamName } = req.params;

    if (!teamName) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = await Team.findOne({ name: teamName });
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Get plan information from config
    let planConfig = null;
    if (team.subscription && team.subscription.plan) {
      const planKey = team.subscription.plan.toUpperCase();
      planConfig = require('../config/stripe').SUBSCRIPTION_PLANS[planKey];
    }

    // Return the limits and usage data
    return res.status(200).json({
      message: 'Limits and usage data retrieved successfully',
      subscription: {
        status: team.subscription?.status || 'inactive',
        plan: team.subscription?.plan || 'free',
        currentPeriodEnd: team.subscription?.currentPeriodEnd
      },
      limits: team.subscription?.limits || (planConfig ? planConfig.limits : {}),
      usage: team.usage || {},
      planDetails: planConfig ? {
        name: planConfig.name,
        price: planConfig.price,
        features: planConfig.features
      } : null
    });
  } catch (error) {
    console.error('Error getting team limits:', error);
    return res.status(500).json({ message: 'Error retrieving team limits', error: error.message });
  }
});

// Add a route to get subscription status for a team
router.get('/subscription-status/:teamName', async (req, res) => {
  try {
    const { teamName } = req.params;

    if (!teamName) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = await Team.findOne({ name: teamName });
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check if subscription is active
    const hasActiveSubscription = team.subscription && 
                                 (team.subscription.status === 'active' || 
                                  team.subscription.status === 'trialing');
    
    // Check if subscription is in grace period
    const now = new Date();
    const subscriptionEndDate = team.subscription?.currentPeriodEnd;
    const isInGracePeriod = subscriptionEndDate && now > subscriptionEndDate && 
                          now < new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days grace period
    
    let gracePeriod = null;
    
    if (isInGracePeriod) {
      const gracePeriodEndDate = new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000));
      const daysLeft = Math.ceil((gracePeriodEndDate - now) / (24 * 60 * 60 * 1000));
      
      gracePeriod = {
        daysLeft,
        endDate: gracePeriodEndDate,
        subscriptionEndDate
      };
    }

    // Get plan information from config
    let planConfig = null;
    if (team.subscription && team.subscription.plan) {
      const planKey = team.subscription.plan.toUpperCase();
      planConfig = require('../config/stripe').SUBSCRIPTION_PLANS[planKey];
    }

    // Return the subscription status
    return res.status(200).json({
      message: 'Subscription status retrieved successfully',
      subscription: {
        status: team.subscription?.status || 'inactive',
        plan: team.subscription?.plan || 'none',
        currentPeriodEnd: team.subscription?.currentPeriodEnd,
        cancelAtPeriodEnd: team.subscription?.cancelAtPeriodEnd || false
      },
      isActive: hasActiveSubscription,
      inGracePeriod: isInGracePeriod,
      gracePeriod,
      limits: team.subscription?.limits || (planConfig ? planConfig.limits : {}),
      usage: team.usage || {}
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return res.status(500).json({ message: 'Error retrieving subscription status', error: error.message });
  }
});

// Add a route to check feature access
router.post('/check-feature-access', async (req, res) => {
  try {
    const { teamName, feature } = req.body;

    if (!teamName || !feature) {
      return res.status(400).json({ message: 'Team name and feature are required' });
    }

    const team = await Team.findOne({ name: teamName });
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Check if subscription is active
    const hasActiveSubscription = team.subscription && 
                                 (team.subscription.status === 'active' || 
                                  team.subscription.status === 'trialing');
    
    // Check if subscription is in grace period
    const now = new Date();
    const subscriptionEndDate = team.subscription?.currentPeriodEnd;
    const isInGracePeriod = subscriptionEndDate && now > subscriptionEndDate && 
                          now < new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // 14 days grace period
    
    let gracePeriod = null;
    
    if (isInGracePeriod) {
      const gracePeriodEndDate = new Date(subscriptionEndDate.getTime() + (14 * 24 * 60 * 60 * 1000));
      const daysLeft = Math.ceil((gracePeriodEndDate - now) / (24 * 60 * 60 * 1000));
      
      gracePeriod = {
        daysLeft,
        endDate: gracePeriodEndDate,
        subscriptionEndDate
      };
    }
    
    // Define feature access requirements based on subscription plan
    const featureRequirements = {
      'offchain': ['websites', 'offchain-analytics'],
      'basic': ['websites', 'offchain-analytics', 'onchain-analytics', 'smart-contracts'],
      'pro': ['websites', 'offchain-analytics', 'onchain-analytics', 'smart-contracts', 'cq-intelligence'],
      'enterprise': ['websites', 'offchain-analytics', 'onchain-analytics', 'smart-contracts', 'cq-intelligence', 'custom-analytics']
    };
    
    // Check if the current plan allows access to this feature
    const currentPlan = team.subscription?.plan || 'none';
    const hasFeatureAccess = currentPlan !== 'none' && 
                            featureRequirements[currentPlan]?.includes(feature);
    
    // Determine access based on subscription status and feature requirements
    const hasAccess = (hasActiveSubscription || isInGracePeriod) && hasFeatureAccess;
    
    if (!hasAccess) {
      // If not in grace period or doesn't have feature access, return a 403
      if (!isInGracePeriod || !hasFeatureAccess) {
        return res.status(403).json({
          subscriptionRequired: true,
          subscriptionStatus: team.subscription?.status || 'inactive',
          subscriptionPlan: team.subscription?.plan || 'none',
          message: !hasFeatureAccess ? 
            `Your current plan (${currentPlan}) does not include access to this feature. Please upgrade to a higher plan.` :
            'An active subscription is required to access this feature.',
          hasAccess: false
        });
      }
    }
    
    // User has access to the feature
    return res.status(200).json({
      hasAccess: true,
      message: 'Access granted',
      inGracePeriod: isInGracePeriod,
      gracePeriod
    });
    
  } catch (error) {
    console.error('Error checking feature access:', error);
    return res.status(500).json({ message: 'Error checking feature access', error: error.message });
  }
});

// ... rest of the file ... 