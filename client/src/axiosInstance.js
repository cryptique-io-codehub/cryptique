import axios from 'axios';

// Use the actual production URL with https, fallback to localhost for development
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

console.log('API Server URL:', baseURL);

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true, // Enable sending cookies
  timeout: 60000
});

// Add request interceptor
axiosInstance.interceptors.request.use(
  config => {
    // Log requests for debugging
    console.log(`API Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`, config.params || {});
    
    // Get token dynamically
    const token = localStorage.getItem("accessToken") || localStorage.getItem("token");
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

// Add response interceptor
axiosInstance.interceptors.response.use(
  response => {
    console.log(`API Response: ${response.status} from ${response.config.url}`, {
      data: response.data ? 'Data received' : 'No data'
    });
    return response;
  },
  async error => {
    const originalRequest = error.config;
    
    // Log detailed error information
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
          localStorage.setItem("accessToken", refreshResponse.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.log("Token refresh failed:", refreshError);
        // Handle logout
        localStorage.clear();
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }
    
    // Implement retry logic for network errors
    if (error.message === 'Network Error' && !originalRequest._retry) {
      originalRequest._retry = true;
      await new Promise(resolve => setTimeout(resolve, 1000));
      return axiosInstance(originalRequest);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;