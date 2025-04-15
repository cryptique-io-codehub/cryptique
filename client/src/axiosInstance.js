import axios from 'axios';
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'http://localhost:3002';

const axiosInstance = axios.create({
  baseURL: baseURL+'/api',
  headers: {
    'Content-Type': 'application/json'
  },
});

// Add a request interceptor to add the token before each request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle authentication errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Only clear and redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;