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
  maxContentLength: 10 * 1024 * 1024, // Reduced to 10MB to avoid 413 errors
  maxBodyLength: 10 * 1024 * 1024, // Reduced to 10MB to avoid 413 errors
  // Ensure credentials are included for CORS requests if needed
  withCredentials: false,
  timeout: 60000 // 60 second timeout
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
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // Log the error for debugging
    console.error("API Error:", error);
    
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

// Helper function to handle large transaction payloads by chunking
axiosInstance.postTransactionsInChunks = async (url, transactionData, chunkSize = 500) => {
  const { transactions } = transactionData;
  
  if (!transactions || transactions.length === 0) {
    return axiosInstance.post(url, transactionData);
  }
  
  // If transactions array is small enough, send as one request
  if (transactions.length <= chunkSize) {
    return axiosInstance.post(url, transactionData);
  }
  
  console.log(`Splitting ${transactions.length} transactions into chunks of ${chunkSize}`);
  
  // Split transactions into chunks
  const chunks = [];
  for (let i = 0; i < transactions.length; i += chunkSize) {
    chunks.push(transactions.slice(i, i + chunkSize));
  }
  
  // Process each chunk sequentially
  let totalResults = { inserted: 0, modified: 0, total: 0 };
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`Processing chunk ${i+1}/${chunks.length}, size: ${chunk.length}`);
    
    try {
      const response = await axiosInstance.post(url, { transactions: chunk });
      totalResults.inserted += response.data.inserted || 0;
      totalResults.modified += response.data.modified || 0;
      totalResults.total += response.data.total || 0;
    } catch (error) {
      console.error(`Error processing chunk ${i+1}:`, error);
      throw error;
    }
  }
  
  return { data: { message: 'All chunks processed successfully', ...totalResults } };
};

export default axiosInstance;