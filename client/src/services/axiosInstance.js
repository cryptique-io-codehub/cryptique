// Improved error handling
const handleAPIError = (error) => {
  // Create a standardized error response
  const errorResponse = {
    url: error.config?.url || 'unknown-url',
    status: error.response?.status || 0,
    message: error.message || 'Unknown error',
    data: error.response?.data || {},
    isNetworkError: error.code === 'ECONNABORTED' || error.message.includes('Network Error'),
    isTimeoutError: error.code === 'ETIMEDOUT' || error.message.includes('timeout'),
    isServiceUnavailable: error.response?.status === 503 || 
                         error.response?.data?.status === 'service_unavailable'
  };

  // Customize message based on error type
  if (errorResponse.isNetworkError) {
    console.error('API Network Error:', errorResponse);
  } else if (errorResponse.isTimeoutError) {
    console.error('API Timeout Error:', errorResponse);
  } else if (errorResponse.isServiceUnavailable) {
    console.log('API Service Unavailable:', errorResponse);
    // Don't log this as an error since we have fallbacks
  } else if (errorResponse.status >= 500) {
    console.error('API Server Error:', errorResponse);
  } else if (errorResponse.status >= 400) {
    console.warn('API Client Error:', errorResponse);
  } else {
    console.error('API Response Error:', errorResponse);
  }
  
  return errorResponse;
};

// Add request interceptor for error handling
instance.interceptors.request.use(
  config => {
    // Add request timestamp for timeout tracking
    config.metadata = { startTime: new Date() };
    return config;
  },
  error => {
    const errorInfo = handleAPIError(error);
    console.error('API Request Error:', errorInfo);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
instance.interceptors.response.use(
  response => {
    // Track response time
    const requestTime = response.config.metadata.startTime;
    const responseTime = new Date() - requestTime;
    
    if (responseTime > 5000) {
      console.warn(`Slow API response: ${response.config.url} took ${responseTime}ms`);
    }
    
    return response;
  },
  error => {
    const errorInfo = handleAPIError(error);
    
    // Only log full errors for non-service unavailable cases
    if (!errorInfo.isServiceUnavailable) {
      console.error('API Error:', error.message);
    }
    
    return Promise.reject(error);
  }
); 