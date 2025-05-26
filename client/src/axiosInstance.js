import axios from 'axios';

// Use the actual production URL with https, fallback to localhost for development (but use https everywhere)
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

console.log('API Server URL:', baseURL);

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024, // 50MB
  timeout: 60000 // 60 seconds timeout
});

// Add request interceptor to handle credentials based on endpoint
axiosInstance.interceptors.request.use(
  config => {
    // Get the current origin
    const origin = window.location.origin;
    
    // Add origin to headers for CORS
    config.headers['Origin'] = origin;
    
    // SDK endpoints don't need credentials
    if (config.url.startsWith('/api/sdk/')) {
      config.withCredentials = false;
    }
    
    // Add authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add team ID if available
    const selectedTeam = localStorage.getItem('selectedTeam');
    if (selectedTeam) {
      config.headers['x-team-id'] = selectedTeam;
    }
    
    return config;
  },
  error => {
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