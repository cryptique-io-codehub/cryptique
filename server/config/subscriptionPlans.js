/**
 * Subscription plan configurations with pricing and limits
 */
const subscriptionPlans = {
  free: {
    name: 'Free Plan',
    price: 0,
    description: 'Basic analytics access with limited features',
    limits: {
      websites: 1,
      smartContracts: 0,
      apiCalls: 10000,
      teamMembers: 1
    },
    features: [
      'Basic analytics',
      'Dashboard access',
      'Limited API calls'
    ],
    durationDays: 30,
    trialDays: 0
  },
  offchain: {
    name: 'Off-Chain Plan',
    price: 59,
    description: 'Off-chain analytics for 1 website and limited team access',
    limits: {
      websites: 1,
      smartContracts: 0,
      apiCalls: 20000,
      teamMembers: 1
    },
    features: [
      'Off-chain analytics only',
      'Single website tracking',
      'Basic reports'
    ],
    durationDays: 30,
    trialDays: 0
  },
  basic: {
    name: 'Basic Plan',
    price: 299,
    description: 'Full app access with moderate usage limits',
    limits: {
      websites: 2,
      smartContracts: 1,
      apiCalls: 40000,
      teamMembers: 2
    },
    features: [
      'Full app access',
      'On-chain analytics',
      'Off-chain analytics',
      'API access',
      'Multiple dashboard views'
    ],
    durationDays: 30,
    trialDays: 0
  },
  pro: {
    name: 'Pro Plan',
    price: 599,
    description: 'Enhanced access with higher usage limits',
    limits: {
      websites: 3,
      smartContracts: 3,
      apiCalls: 150000,
      teamMembers: 3
    },
    features: [
      'Everything in Basic',
      'Advanced analytics',
      'Priority support',
      'Custom export formats',
      'API rate limit increase'
    ],
    durationDays: 30,
    trialDays: 0
  },
  enterprise: {
    name: 'Enterprise Plan',
    price: null, // Custom pricing
    description: 'Custom plan for enterprise needs',
    limits: {
      websites: null, // Custom limit
      smartContracts: null, // Custom limit
      apiCalls: null, // Custom limit
      teamMembers: null // Custom limit
    },
    features: [
      'Everything in Pro',
      'Custom integrations',
      'Dedicated support',
      'Custom reporting',
      'SLA guarantees',
      'White-label options'
    ],
    durationDays: 30,
    trialDays: 0,
    isCustom: true
  },
  cq_intelligence_addon: {
    name: 'CQ Intelligence Add-on',
    price: 299,
    description: 'AI-powered crypto market intelligence add-on',
    isAddon: true,
    durationDays: 30,
    trialDays: 0
  }
};

module.exports = subscriptionPlans; 