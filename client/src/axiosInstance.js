import axios from 'axios';

// Use the actual production URL with https, fallback to localhost for development (but use https everywhere)
const baseURL = process.env.REACT_APP_API_SERVER_URL || 'https://cryptique-backend.vercel.app';

console.log('API Server URL:', baseURL);

// Create axios instance with proper configuration
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    // Add CORS headers
    'Access-Control-Allow-Origin': 'https://app.cryptique.io',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  },
  maxContentLength: 50 * 1024 * 1024,
  maxBodyLength: 50 * 1024 * 1024,
  withCredentials: true, // Enable credentials for CORS
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

    // Add CORS headers to every request
    config.headers['Access-Control-Allow-Origin'] = 'https://app.cryptique.io';
    
    // Handle preflight OPTIONS requests
    if (config.method.toLowerCase() === 'options') {
      config.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS';
      config.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
      config.headers['Access-Control-Max-Age'] = '3600';
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
      data: error.response?.data,
      headers: error.response?.headers
    });

    // Handle CORS errors specifically
    if (error.message === 'Network Error' || (error.response && error.response.status === 0)) {
      console.error('CORS or Network Error detected. Please check backend CORS configuration.');
      // You might want to notify the user about the CORS issue
      return Promise.reject({
        ...error,
        message: 'Unable to connect to the server. Please check your connection or contact support.'
      });
    }
    
    // Handle 401 errors (token expired)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshResponse = await axios.post(
          `${baseURL}/api/auth/refresh-token`, 
          {}, 
          { 
            withCredentials: true,
            headers: {
              'Access-Control-Allow-Origin': 'https://app.cryptique.io'
            }
          }
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

// Single export at the end of the file
export default axiosInstance;