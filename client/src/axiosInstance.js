import axios from 'axios';

// Use the actual production URL with https
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL + '/api',
  headers: {
    'Content-Type': 'application/json',
    // Adding additional headers that might help with CORS
    'Accept': 'application/json'
  },
  // Ensure credentials are included for CORS requests if needed
  withCredentials: false
});

// Add request interceptor to dynamically get the token before each request
axiosInstance.interceptors.request.use(
  config => {
    // Get token dynamically on each request - not from closure
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error("API Error:", error.message);
    
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      console.log("Unauthorized access, please login again");
      
      // Redirect to login page if unauthorized
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        localStorage.removeItem("token");
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;