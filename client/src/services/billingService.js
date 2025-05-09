import axios from 'axios';
import { getToken } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Get current subscription details for a team
 */
export const getSubscription = async (teamId) => {
  try {
    const token = getToken();
    const response = await axios.get(`${API_URL}/api/coinbase/subscription/${teamId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Create a checkout for a subscription plan
 */
export const createCheckout = async (checkoutData) => {
  try {
    const token = getToken();
    const response = await axios.post(`${API_URL}/api/coinbase/checkout`, checkoutData, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error creating checkout:', error);
    throw error;
  }
};

/**
 * Get available subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const token = getToken();
    const response = await axios.get(`${API_URL}/api/plans`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    // If API not available, return hardcoded plans
    return {
      plans: {
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
          ]
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
          ]
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
          ]
        },
        enterprise: {
          name: 'Enterprise Plan',
          price: null,
          description: 'Custom plan for enterprise needs',
          limits: {
            websites: null,
            smartContracts: null,
            apiCalls: null,
            teamMembers: null
          },
          features: [
            'Everything in Pro',
            'Custom integrations',
            'Dedicated support',
            'Custom reporting',
            'SLA guarantees',
            'White-label options'
          ],
          isCustom: true
        },
        cq_intelligence_addon: {
          name: 'CQ Intelligence Add-on',
          price: 299,
          description: 'AI-powered crypto market intelligence add-on',
          isAddon: true
        }
      }
    };
  }
};

/**
 * Sync a team with Zoho CRM
 */
export const syncTeamWithZoho = async (teamId) => {
  try {
    const token = getToken();
    const response = await axios.post(`${API_URL}/api/zoho/sync/team`, { teamId }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error syncing team with Zoho:', error);
    throw error;
  }
};

/**
 * Sync a user with Zoho CRM
 */
export const syncUserWithZoho = async (userId) => {
  try {
    const token = getToken();
    const response = await axios.post(`${API_URL}/api/zoho/sync/user`, { userId }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error syncing user with Zoho:', error);
    throw error;
  }
}; 