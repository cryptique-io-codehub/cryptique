require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Subscription plans
const SUBSCRIPTION_PLANS = {
  OFFCHAIN: {
    name: 'Off-chain',
    price: 59, // Monthly price in USD
    annualPrice: 590, // Annual price (saving ~2 months)
    description: 'Off-chain analytics, 1 website, no extra users',
    limits: {
      websites: 1,
      smartContracts: 0,
      apiCalls: 0,
      teamMembers: 1
    },
    features: [
      'Off-chain analytics only',
      'Link 1 website',
      'Basic reporting'
    ]
  },
  BASIC: {
    name: 'Basic',
    price: 299, // Monthly price in USD
    annualPrice: 2990, // Annual price (saving ~2 months)
    description: 'Full access with limits, 2 websites, 1 smart contract, 2 team members',
    limits: {
      websites: 2,
      smartContracts: 1,
      apiCalls: 40000,
      teamMembers: 2
    },
    features: [
      'Full app access',
      'Link 2 websites',
      'Link 1 smart contract',
      'Monthly API calls: 40,000',
      'Team size: 2 members'
    ]
  },
  PRO: {
    name: 'Pro',
    price: 599, // Monthly price in USD
    annualPrice: 5990, // Annual price (saving ~2 months)
    description: 'Enhanced access, 3 websites, 3 smart contracts, 3 team members',
    limits: {
      websites: 3,
      smartContracts: 3,
      apiCalls: 150000,
      teamMembers: 3
    },
    features: [
      'Full app access',
      'Link 3 websites',
      'Link 3 smart contracts',
      'Monthly API calls: 150,000',
      'Team size: 3 members'
    ]
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: null, // Custom pricing
    annualPrice: null, // Custom pricing
    description: 'Custom plan with tailored limits and support',
    limits: {
      websites: null, // Custom
      smartContracts: null, // Custom
      apiCalls: null, // Custom
      teamMembers: null // Custom
    },
    features: [
      'Full app access',
      'Custom number of websites',
      'Custom number of smart contracts',
      'Custom API call limits',
      'Custom team size',
      'Priority support'
    ]
  }
};

// Add-on
const ADDONS = {
  CQ_INTELLIGENCE: {
    name: 'CQ Intelligence',
    price: 299, // Monthly price in USD
    annualPrice: 2990, // Annual price (saving ~2 months)
    description: 'AI-powered analytics and insights'
  }
};

module.exports = {
  stripe,
  SUBSCRIPTION_PLANS,
  ADDONS,
  
  // Price IDs from Stripe dashboard for different billing cycles
  STRIPE_PRICE_IDS: {
    // Monthly price IDs
    OFFCHAIN: process.env.STRIPE_PRICE_ID_OFFCHAIN,
    BASIC: process.env.STRIPE_PRICE_ID_BASIC,
    PRO: process.env.STRIPE_PRICE_ID_PRO,
    ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    CQ_INTELLIGENCE: process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE,
    
    // Annual price IDs
    OFFCHAIN_ANNUAL: process.env.STRIPE_PRICE_ID_OFFCHAIN_ANNUAL,
    BASIC_ANNUAL: process.env.STRIPE_PRICE_ID_BASIC_ANNUAL,
    PRO_ANNUAL: process.env.STRIPE_PRICE_ID_PRO_ANNUAL,
    CQ_INTELLIGENCE_ANNUAL: process.env.STRIPE_PRICE_ID_CQ_INTELLIGENCE_ANNUAL
  }
}; 