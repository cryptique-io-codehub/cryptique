import axios from 'axios';

// Base API URL - use the production backend URL
const API_URL = process.env.REACT_APP_API_URL || 'https://cryptique-backend.vercel.app';

// Create axios instance with proper headers
const createApiClient = () => {
  // Get token dynamically on each request
  const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
  
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    withCredentials: true
  });
};

/**
 * Get all subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const apiClient = createApiClient();
    const response = await apiClient.get('/api/stripe/plans');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

/**
 * Create checkout session for a subscription
 */
export const createCheckoutSession = async (teamId, planType, successUrl, cancelUrl, billingCycle = 'monthly', billingAddress = null) => {
  try {
    const apiClient = createApiClient();
    console.log('Creating checkout session with params:', {
      teamId,
      planType,
      billingCycle,
      successUrl: successUrl ? successUrl.substring(0, 50) + '...' : undefined,
      cancelUrl: cancelUrl ? cancelUrl.substring(0, 50) + '...' : undefined,
      hasAddress: !!billingAddress,
      addressFields: billingAddress ? Object.keys(billingAddress) : []
    });
    
    // Make sure planType is lowercase for consistency with server expectations
    const normalizedPlanType = typeof planType === 'string' ? planType.toLowerCase() : planType;
    
    const response = await apiClient.post('/api/stripe/create-checkout-session', {
      teamId,
      planType: normalizedPlanType,
      successUrl,
      cancelUrl,
      billingCycle,
      billingAddress
    });
    
    console.log('Checkout session created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    // Log more details about the error
    if (error.response) {
      console.error('Response error data:', error.response.data);
      console.error('Response error status:', error.response.status);
      
      // Check for specific error messages
      if (error.response.data && error.response.data.error) {
        if (error.response.data.error.includes('Invalid plan type')) {
          console.error('Plan type error. Make sure plan type is one of: offchain, basic, pro, enterprise');
        } else if (error.response.data.error.includes('Price ID not found')) {
          console.error('Price ID error. Check that Stripe price IDs are correctly configured in server environment');
        }
      }
    }
    throw error;
  }
};

/**
 * Add CQ Intelligence add-on to a subscription
 */
export const addCQIntelligence = async (teamId, subscriptionId, billingCycle = 'monthly') => {
  try {
    const apiClient = createApiClient();
    const response = await apiClient.post('/api/stripe/add-cq-intelligence', {
      teamId,
      subscriptionId,
      billingCycle
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
    const apiClient = createApiClient();
    const response = await apiClient.post('/api/stripe/cancel-cq-intelligence', {
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
    const apiClient = createApiClient();
    const response = await apiClient.get(`/api/stripe/subscription/${teamId}`);
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
    const apiClient = createApiClient();
    const response = await apiClient.post('/api/stripe/cancel-subscription', {
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
    const apiClient = createApiClient();
    const response = await apiClient.post('/api/stripe/create-portal-session', {
      teamId,
      returnUrl
    });
    return response.data;
  } catch (error) {
    console.error('Error creating portal session:', error);
    throw error;
  }
}; 