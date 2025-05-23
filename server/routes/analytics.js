const express = require('express');
const router = express.Router();
const createApiClient = require('../utils/apiClient');
const { defaultCache } = require('../utils/cacheManager');
const createRateLimiter = require('../middleware/rateLimiter');

// Create API client with dynamic timeouts and retry
const apiClient = createApiClient();

// Create rate limiters
const rateLimiters = createRateLimiter();

// Apply analytics rate limiter to all routes in this router
router.use(rateLimiters.analytics);

// Cache configuration for different endpoints
const CACHE_CONFIG = {
  chart: {
    ttl: 'medium',   // 30 minutes
    keyPrefix: 'analytics:chart'
  },
  userJourneys: {
    ttl: 'short',    // 1 minute
    keyPrefix: 'analytics:user-journeys'
  },
  userSessions: {
    ttl: 'default',  // 5 minutes
    keyPrefix: 'analytics:user-sessions'
  }
};

// Helper to create cache keys
const createCacheKey = (prefix, params) => {
  return `${prefix}:${Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join(':')}`;
};

// Get chart data
router.get('/chart', async (req, res) => {
  const { siteId, timeframe = 'daily' } = req.query;
  
  if (!siteId) {
    return res.status(400).json({ success: false, error: 'Site ID is required' });
  }
  
  console.log(`Chart data requested for site: ${siteId}, timeframe: ${timeframe}`);
  
  try {
    // Create cache key
    const cacheKey = createCacheKey(CACHE_CONFIG.chart.keyPrefix, { siteId, timeframe });
    
    // Try to get from cache or fetch from backend
    const data = await defaultCache.wrap(
      cacheKey,
      async () => {
        console.log(`Cache miss for ${cacheKey}, fetching from backend`);
        const response = await apiClient.fetchQuick('/analytics/chart', { 
          params: { siteId, timeframe } 
        });
        return response.data;
      },
      CACHE_CONFIG.chart.ttl
    );
    
    // Return data (either from cache or freshly fetched)
    res.json(data);
  } catch (error) {
    console.error('Error fetching chart data from backend:', error);
    res.status(error.response?.status || 500).json({
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch chart data from backend'
    });
  }
});

// Get user journeys data
router.get('/user-journeys', async (req, res) => {
  const { siteId, teamId, timeframe, page = 1, limit = 25 } = req.query;
  
  if (!siteId) {
    return res.status(400).json({ success: false, error: 'Site ID is required' });
  }
  
  console.log("User-journeys request received:", { siteId, teamId, timeframe, page, limit });
  
  try {
    // Create cache key
    const cacheKey = createCacheKey(CACHE_CONFIG.userJourneys.keyPrefix, { 
      siteId, teamId, timeframe, page, limit 
    });
    
    // Try to get from cache or fetch from backend
    const data = await defaultCache.wrap(
      cacheKey,
      async () => {
        console.log(`Cache miss for ${cacheKey}, fetching from backend`);
        const response = await apiClient.fetch('/analytics/user-journeys', { 
          params: { siteId, teamId, timeframe, page, limit } 
        });
        return response.data;
      },
      CACHE_CONFIG.userJourneys.ttl
    );
    
    // Return data (either from cache or freshly fetched)
    res.json(data);
  } catch (error) {
    console.error('Error fetching user journeys from backend:', error);
    res.status(error.response?.status || 500).json({
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user journeys from backend'
    });
  }
});

// Get user sessions data
router.get('/user-sessions', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  console.log(`Fetching sessions for user: ${userId}`);
  
  try {
    // Create cache key
    const cacheKey = createCacheKey(CACHE_CONFIG.userSessions.keyPrefix, { userId });
    
    // Try to get from cache or fetch from backend
    const data = await defaultCache.wrap(
      cacheKey,
      async () => {
        console.log(`Cache miss for ${cacheKey}, fetching from backend`);
        const response = await apiClient.fetch('/analytics/user-sessions', { 
          params: { userId } 
        });
        return response.data;
      },
      CACHE_CONFIG.userSessions.ttl
    );
    
    // Return data (either from cache or freshly fetched)
    res.json(data);
  } catch (error) {
    console.error('Error fetching user sessions from backend:', error);
    res.status(error.response?.status || 500).json({
      success: false, 
      error: error.response?.data?.error || 'Failed to fetch user sessions from backend'
    });
  }
});

// Process user journeys - convert sessions into user journey data
// This is a long-running operation, so we use a longer timeout
router.post('/process-journeys', async (req, res) => {
  const { siteId } = req.body;
  
  if (!siteId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Site ID is required' 
    });
  }
  
  console.log(`Processing user journeys for site: ${siteId}`);
  
  try {
    // This is a processing operation, not suitable for caching
    // Use longer timeout for this complex operation
    const response = await apiClient.fetchComplex('/analytics/process-journeys', {
      method: 'POST',
      data: { siteId }
    });
    
    // Invalidate related caches since we've updated the data
    defaultCache.deletePattern(`${CACHE_CONFIG.userJourneys.keyPrefix}:siteId=${siteId}:*`);
    
    // Return real data with helpful status message
    let responseData = response.data;
    
    // Add a user-friendly message if not already present
    if (!responseData.message) {
      if (responseData.success) {
        responseData.message = `Successfully processed ${responseData.journeysCreated || 0} user journeys`;
      } else {
        responseData.message = 'Failed to process user journeys. Please try again later.';
      }
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('Error processing user journeys from backend:', error);
    
    // Get error details if available from the backend
    let errorMessage = 'Failed to process user journeys. Please try again later.';
    let errorDetails = null;
    
    if (error.response && error.response.data) {
      errorDetails = error.response.data.error || error.response.data.message;
      
      if (error.response.data.error === 'No sessions found for this site') {
        errorMessage = 'No sessions available to process. Please ensure users are visiting your site with the tracking script installed.';
      } else if (error.response.data.error === 'No sessions with user IDs found') {
        errorMessage = 'Sessions exist but no user data is available. This could indicate issues with the tracking script.';
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      }
    }
    
    res.status(error.response?.status || 500).json({
      success: false, 
      error: errorMessage,
      details: errorDetails || error.message
    });
  }
});

// Cache stats endpoint (for monitoring)
router.get('/cache-stats', (req, res) => {
  res.json(defaultCache.getStats());
});

// Clear cache endpoint (for admin use)
router.post('/clear-cache', rateLimiters.sensitive, (req, res) => {
  const { pattern } = req.body;
  
  if (pattern) {
    const count = defaultCache.deletePattern(pattern);
    res.json({ 
      success: true, 
      message: `Cleared ${count} cache entries matching pattern: ${pattern}` 
    });
  } else {
    defaultCache.clear();
    defaultCache.resetStats();
    res.json({ 
      success: true, 
      message: 'Complete cache cleared and stats reset' 
    });
  }
});

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    // Test connection to real backend
    const response = await apiClient.fetchQuick('/health');
    res.json({ 
      message: 'Server is working!',
      backendStatus: response.data,
      cacheStats: defaultCache.getStats()
    });
  } catch (error) {
    res.json({ 
      message: 'Server is working but backend connection failed',
      error: error.message,
      cacheStats: defaultCache.getStats()
    });
  }
});

module.exports = router; 