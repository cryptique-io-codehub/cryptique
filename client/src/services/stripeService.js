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
    
    // Validate and ensure URLs are properly encoded
    let validatedSuccessUrl = successUrl;
    let validatedCancelUrl = cancelUrl;
    
    try {
      // Check if URLs are already valid
      new URL(successUrl);
      new URL(cancelUrl);
    } catch (error) {
      // If not valid, try to fix common issues like spaces
      console.warn("URL validation failed, attempting to fix URLs:", error.message);
      
      // Try to encode parts of the URL that might contain spaces
      if (successUrl && typeof successUrl === 'string') {
        const [baseUrl, ...rest] = successUrl.split('/');
        validatedSuccessUrl = baseUrl + '/' + rest.map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
      }
      
      if (cancelUrl && typeof cancelUrl === 'string') {
        const [baseUrl, ...rest] = cancelUrl.split('/');
        validatedCancelUrl = baseUrl + '/' + rest.map(part => encodeURIComponent(decodeURIComponent(part))).join('/');
      }
      
      // Verify the fixed URLs are now valid
      try {
        new URL(validatedSuccessUrl);
        new URL(validatedCancelUrl);
        console.log("URLs fixed successfully");
      } catch (validationError) {
        console.error("Failed to fix URLs:", validationError.message);
        throw new Error(`Invalid URL format: ${validationError.message}`);
      }
    }
    
    console.log('Creating checkout session with params:', {
      teamId,
      planType,
      billingCycle,
      successUrl: validatedSuccessUrl ? validatedSuccessUrl.substring(0, 50) + '...' : undefined,
      cancelUrl: validatedCancelUrl ? validatedCancelUrl.substring(0, 50) + '...' : undefined,
      hasAddress: !!billingAddress,
      addressFields: billingAddress ? Object.keys(billingAddress) : []
    });
    
    // Make sure planType is lowercase for consistency with server expectations
    const normalizedPlanType = typeof planType === 'string' ? planType.toLowerCase() : planType;
    
    const response = await apiClient.post('/api/stripe/create-checkout-session', {
      teamId,
      planType: normalizedPlanType,
      successUrl: validatedSuccessUrl,
      cancelUrl: validatedCancelUrl,
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
        } else if (error.response.data.error.includes('Invalid URL')) {
          console.error('URL error. Check that success and cancel URLs are properly formatted and encoded');
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