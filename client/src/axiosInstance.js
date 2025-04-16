import axios from 'axios';

// Use the actual production URL with https
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';
const token = localStorage.getItem("token");

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL + '/api',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    // Adding additional headers that might help with CORS
    'Accept': 'application/json'
  },
  // Ensure credentials are included for CORS requests if needed
  withCredentials: false
});

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error("API Error:", error.message);
    
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      console.log("Unauthorized access, please login again");
      // You might want to redirect to login or refresh token here
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;