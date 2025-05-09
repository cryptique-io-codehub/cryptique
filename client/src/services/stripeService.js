import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://cryptique-backend.vercel.app');

/**
 * Get all subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stripe/plans`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    // Return mock data if the API fails
    return {
      plans: {
        OFFCHAIN: {
          name: 'Off-chain',
          price: 59,
          annualPrice: 590, // ~2 months free
          description: 'Off-chain analytics, 1 website, no extra users',
          limits: { websites: 1, smartContracts: 0, apiCalls: 0, teamMembers: 1 },
          features: ['Off-chain analytics only', 'Link 1 website', 'Basic reporting']
        },
        BASIC: {
          name: 'Basic',
          price: 299,
          annualPrice: 2990, // ~2 months free
          description: 'Full access with limits, 2 websites, 1 smart contract, 2 team members',
          limits: { websites: 2, smartContracts: 1, apiCalls: 40000, teamMembers: 2 },
          features: ['Full app access', 'Link 2 websites', 'Link 1 smart contract', 'Monthly API calls: 40,000', 'Team size: 2 members']
        },
        PRO: {
          name: 'Pro',
          price: 599,
          annualPrice: 5990, // ~2 months free
          description: 'Enhanced access, 3 websites, 3 smart contracts, 3 team members',
          limits: { websites: 3, smartContracts: 3, apiCalls: 150000, teamMembers: 3 },
          features: ['Full app access', 'Link 3 websites', 'Link 3 smart contracts', 'Monthly API calls: 150,000', 'Team size: 3 members']
        },
        ENTERPRISE: {
          name: 'Enterprise',
          price: null,
          annualPrice: null,
          description: 'Custom plan with tailored limits and support',
          limits: { websites: null, smartContracts: null, apiCalls: null, teamMembers: null },
          features: ['Full app access', 'Custom number of websites', 'Custom number of smart contracts', 'Custom API call limits', 'Custom team size', 'Priority support']
        }
      },
      addons: {
        CQ_INTELLIGENCE: {
          name: 'CQ Intelligence',
          price: 299,
          annualPrice: 2990,
          description: 'AI-powered analytics and insights'
        }
      }
    };
  }
};

/**
 * Create checkout session for a subscription
 */
export const createCheckoutSession = async (teamId, planType, successUrl, cancelUrl, billingCycle = 'monthly') => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/create-checkout-session`, {
      teamId,
      planType,
      successUrl,
      cancelUrl,
      billingCycle
    });
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Add CQ Intelligence add-on to a subscription
 */
export const addCQIntelligence = async (teamId, subscriptionId) => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/add-cq-intelligence`, {
      teamId,
      subscriptionId
    });
    return response.data;
  } catch (error) {
    console.error('Error adding CQ Intelligence:', error);
    throw error;
  }
};

/**
 * Cancel CQ Intelligence add-on
 */
export const cancelCQIntelligence = async (teamId, subscriptionId) => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/cancel-cq-intelligence`, {
      teamId,
      subscriptionId
    });
    return response.data;
  } catch (error) {
    console.error('Error canceling CQ Intelligence:', error);
    throw error;
  }
};

/**
 * Get current subscription for a team
 */
export const getSubscription = async (teamId) => {
  try {
    const response = await axios.get(`${API_URL}/api/stripe/subscription/${teamId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // No subscription found is not an error in many cases
      return null;
    }
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/cancel-subscription`, {
      subscriptionId
    });
    return response.data;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
};

/**
 * Create a customer portal session
 */
export const createPortalSession = async (teamId, returnUrl) => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/create-portal-session`, {
      teamId,
      returnUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}; 