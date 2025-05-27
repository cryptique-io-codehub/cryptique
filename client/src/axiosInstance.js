import axios from 'axios';

// Use the production URL with https, fallback to localhost for development
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

console.log('API Server URL:', baseURL);

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL + '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024, // 50MB
  withCredentials: true, // Set to true by default for authenticated routes
  timeout: 60000 // 60 seconds timeout
});

// Add request interceptor to dynamically get the token before each request
axiosInstance.interceptors.request.use(
  config => {
    // Log requests for debugging
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.params || {});
    
    // Check if this is an analytics or RAG endpoint that's causing CORS issues
    if (config.url && (
      config.url.includes('/sdk/analytics/') ||
      config.url.includes('/intelligence/') ||
      config.url.includes('/rag/')
    )) {
      // For these endpoints, explicitly set withCredentials to false
      config.withCredentials = false;
    }
    
    // Get token dynamically on each request
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Special handling for team routes
    if (config.url && config.url.includes('/team/')) {
      // Ensure content type is always set correctly for all team routes
      config.headers['Content-Type'] = 'application/json';
      
      // Ensure Authorization header is set for team routes
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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

export default axiosInstance;