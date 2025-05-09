import axios from 'axios';

// Base API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Get all subscription plans
 */
export const getSubscriptionPlans = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/stripe/plans`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

/**
 * Create checkout session for a subscription
 */
export const createCheckoutSession = async (teamId, planType, successUrl, cancelUrl) => {
  try {
    const response = await axios.post(`${API_URL}/api/stripe/create-checkout-session`, {
      teamId,
      planType,
      successUrl,
      cancelUrl
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