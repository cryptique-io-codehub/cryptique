// Coinbase Commerce subscription utilities
import { createCoinbaseClient } from './config';
import { CoinbasePaymentAPI } from './payments';

// Define subscription plans
export const SUBSCRIPTION_PLANS = {
  OFF_CHAIN: {
    id: 'off_chain',
    name: 'Off-chain',
    description: 'Off-chain analytics for 1 website. No extra users allowed.',
    amount: 59,
    currency: 'USD',
    features: {
      websiteCount: 1,
      contractCount: 0, 
      teamMemberCount: 1,
      apiCallLimit: 20000,
      includesCQIntelligence: false,
    }
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    description: 'Full access with limits: 2 websites and 1 smart contract. API call limit: 40,000/month. Team size: 2 members.',
    amount: 299,
    currency: 'USD',
    features: {
      websiteCount: 2,
      contractCount: 1,
      teamMemberCount: 2,
      apiCallLimit: 40000,
      includesCQIntelligence: false,
    }
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    description: 'Full access with limits: 3 websites and 3 smart contracts. API call limit: 150,000/month. Team size: 3 members.',
    amount: 599,
    currency: 'USD',
    features: {
      websiteCount: 3,
      contractCount: 3,
      teamMemberCount: 3,
      apiCallLimit: 150000,
      includesCQIntelligence: false,
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom plan with tailored limits and features.',
    amount: null, // Custom pricing
    currency: 'USD',
    features: {
      websiteCount: null, // Custom
      contractCount: null, // Custom
      teamMemberCount: null, // Custom
      apiCallLimit: null, // Custom
      includesCQIntelligence: false,
    }
  },
  CQ_INTELLIGENCE_ADDON: {
    id: 'cq_intelligence',
    name: 'CQ Intelligence Add-on',
    description: 'CQ Intelligence feature add-on.',
    amount: 299,
    currency: 'USD',
  }
};

/**
 * Subscription management utilities for Coinbase Commerce
 */
export const CoinbaseSubscriptionAPI = {
  /**
   * Create a new subscription charge
   * 
   * @param {string} planId - The plan ID from SUBSCRIPTION_PLANS
   * @param {Object} customerData - Customer information
   * @param {boolean} includesCQIntelligence - Whether to include CQ Intelligence add-on
   */
  createSubscription: async (planId, customerData, includesCQIntelligence = false) => {
    try {
      const plan = SUBSCRIPTION_PLANS[planId];
      
      if (!plan) {
        throw new Error(`Invalid plan ID: ${planId}`);
      }
      
      // Calculate total amount
      let totalAmount = plan.amount;
      
      // Add CQ Intelligence if selected
      if (includesCQIntelligence) {
        totalAmount += SUBSCRIPTION_PLANS.CQ_INTELLIGENCE_ADDON.amount;
      }
      
      // Create charge for the subscription
      const chargeData = {
        name: `${plan.name} Plan${includesCQIntelligence ? ' with CQ Intelligence' : ''}`,
        description: plan.description,
        amount: totalAmount,
        currency: plan.currency,
        metadata: {
          customer_id: customerData.customerId,
          customer_email: customerData.email,
          plan_id: planId,
          includes_cq_intelligence: includesCQIntelligence,
          team_id: customerData.teamId,
          subscription_type: 'monthly'
        }
      };
      
      return await CoinbasePaymentAPI.createCharge(chargeData);
    } catch (error) {
      console.error('Failed to create subscription:', error);
      throw error;
    }
  },
  
  /**
   * Get plan details by ID
   */
  getPlanDetails: (planId) => {
    return SUBSCRIPTION_PLANS[planId] || null;
  },
  
  /**
   * List all available plans
   */
  listPlans: () => {
    return Object.values(SUBSCRIPTION_PLANS).filter(plan => plan.id !== 'cq_intelligence');
  }
};

export default CoinbaseSubscriptionAPI; 