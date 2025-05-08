import axios from 'axios';

// Use the actual production URL with https, fallback to localhost for development
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3001';

console.log('API Server URL:', baseURL);

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    // Adding additional headers that might help with CORS
    'Accept': 'application/json'
  },
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024, // 50MB
  // Set withCredentials based on environment
  withCredentials: false, // Changed to false by default
  // Add timeout configuration
  timeout: 60000 // 60 seconds timeout
});

// Add request interceptor to dynamically get the token before each request
axiosInstance.interceptors.request.use(
  config => {
    // Log requests for debugging
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.params || {});
    
    // Check if this is an analytics endpoint that's causing CORS issues
    if (config.url && (
      config.url.includes('/sdk/analytics/') ||
      config.url.includes('/intelligence/')
    )) {
      // For these endpoints, explicitly set withCredentials to false
      config.withCredentials = false;
    } else {
      // For all other endpoints, use credentials
      config.withCredentials = true;
    }
    
    // Get token dynamically on each request - not from closure
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} from ${response.config.url}`, {
      data: response.data ? 'Data received' : 'No data'
    });
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    console.error('API Response Error:', {
      url: originalRequest?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data 
    });
    
    // Handle 401 errors (token expired)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(
          `${baseURL}/api/auth/refresh-token`, 
          {}, 
          { withCredentials: true }
        );
        
        if (refreshResponse.data.accessToken) {
          // Save the new access token
          localStorage.setItem("accessToken", refreshResponse.data.accessToken);
          
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.log("Token refresh failed:", refreshError);
        
        // If refresh token also fails, logout the user
        localStorage.removeItem("accessToken");
        localStorage.removeItem("User");
        localStorage.removeItem("selectedTeam");
        localStorage.removeItem("selectedWebsite");
        
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }
    
    // Implement retry logic for network errors
    if (error.message === 'Network Error' && !originalRequest._retry) {
      console.log('Network error detected, retrying...');
      originalRequest._retry = true;
      
      // Add a small delay before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return a new request
      return axiosInstance(originalRequest);
    }
    
    // Log the error for debugging
    console.error("API Error:", error.message);
    
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      console.log("Unauthorized access, please login again");
      
      // Redirect to login page if unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("User");
        localStorage.removeItem("selectedTeam");
        localStorage.removeItem("selectedWebsite");
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Billing APIs
export const getSubscriptionPlans = async () => {
  try {
    const response = await axiosInstance.get('/billing/plans');
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
};

export const createCheckoutSession = async (teamId, planType, hasCQIntelligence = false) => {
  try {
    const response = await axiosInstance.post('/billing/checkout', {
      teamId,
      planType,
      hasCQIntelligence
    });
    return response.data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

export const getActiveSubscription = async (teamId) => {
  try {
    const response = await axiosInstance.get(`/billing/subscription/${teamId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // No active subscription - this is a valid state
      return null;
    }
    console.error('Error fetching active subscription:', error);
    throw error;
  }
};

export const getSubscriptionHistory = async (teamId) => {
  try {
    const response = await axiosInstance.get(`/billing/subscriptions/${teamId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    throw error;
  }
};

export const updateBillingDetails = async (teamId, billingDetails) => {
  try {
    const response = await axiosInstance.put(`/billing/billing/${teamId}`, billingDetails);
    return response.data;
  } catch (error) {
    console.error('Error updating billing details:', error);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId) => {
  try {
    const response = await axiosInstance.post(`/billing/cancel/${subscriptionId}`);
    return response.data;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

// Zoho CRM APIs
export const createOrUpdateContact = async (contactData) => {
  try {
    const response = await axiosInstance.post('/crm/contact', contactData);
    return response.data;
  } catch (error) {
    console.error('Error managing contact:', error);
    throw error;
  }
};

export const getContactDetails = async (teamId) => {
  try {
    const response = await axiosInstance.get(`/crm/contact/${teamId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // No contact found - this is a valid state
      return null;
    }
    console.error('Error fetching contact details:', error);
    throw error;
  }
};

export default axiosInstance;