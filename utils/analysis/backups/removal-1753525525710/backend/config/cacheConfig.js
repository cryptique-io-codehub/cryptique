/**
 * Cache Configuration for Different Route Types
 * Centralized cache settings for consistent performance optimization
 */

const { createCacheMiddleware } = require('../middleware/cacheMiddleware');

// Cache configurations for different data types
const cacheConfigs = {
  // Analytics data caching
  analytics: {
    chartData: {
      ttl: 300, // 5 minutes
      useL2: true,
      description: 'Chart data for analytics dashboards'
    },
    trafficSources: {
      ttl: 900, // 15 minutes
      useL2: true,
      description: 'Traffic sources and campaign data'
    },
    userJourneys: {
      ttl: 1800, // 30 minutes
      useL2: true,
      description: 'User journey analytics data'
    },
    userSessions: {
      ttl: 600, // 10 minutes
      useL2: true,
      description: 'Individual user session data'
    }
  },
  
  // On-chain data caching
  onchain: {
    smartContracts: {
      ttl: 3600, // 1 hour
      useL2: true,
      description: 'Smart contract verification results'
    },
    crossChain: {
      ttl: 1800, // 30 minutes
      useL2: true,
      description: 'Cross-chain wallet data'
    },
    transactions: {
      ttl: 600, // 10 minutes
      useL2: true,
      description: 'Transaction data and history'
    }
  },
  
  // User and team data caching
  user: {
    profile: {
      ttl: 1800, // 30 minutes
      useL2: true,
      description: 'User profile information'
    },
    teams: {
      ttl: 900, // 15 minutes
      useL2: true,
      description: 'Team information and settings'
    },
    websites: {
      ttl: 1800, // 30 minutes
      useL2: true,
      description: 'Website configuration data'
    }
  },
  
  // AI and processing results
  ai: {
    embeddings: {
      ttl: 7200, // 2 hours
      useL2: true,
      description: 'AI-generated embeddings'
    },
    analysis: {
      ttl: 3600, // 1 hour
      useL2: true,
      description: 'AI analysis results'
    }
  }
};

// Create cache middleware instances
const cacheMiddlewares = {
  // Analytics middlewares
  chartData: createCacheMiddleware({
    ...cacheConfigs.analytics.chartData,
    keyGenerator: (req) => {
      const { siteId, timeframe, start, end } = req.query;
      const cacheService = require('../services/cacheService');
      return cacheService.generateCacheKey(
        cacheService.config.keyPrefixes.chartData,
        siteId,
        { timeframe, start, end }
      );
    }
  }),
  
  trafficSources: createCacheMiddleware({
    ...cacheConfigs.analytics.trafficSources,
    keyGenerator: (req) => {
      const { siteId, start, end } = req.query;
      const cacheService = require('../services/cacheService');
      return cacheService.generateCacheKey(
        cacheService.config.keyPrefixes.trafficSources,
        siteId,
        { start, end }
      );
    }
  }),
  
  userJourneys: createCacheMiddleware({
    ...cacheConfigs.analytics.userJourneys,
    keyGenerator: (req) => {
      const { siteId, teamId, timeframe } = req.query;
      const cacheService = require('../services/cacheService');
      return cacheService.generateCacheKey(
        cacheService.config.keyPrefixes.userJourneys,
        siteId,
        { teamId, timeframe }
      );
    }
  }),
  
  userSessions: createCacheMiddleware({
    ...cacheConfigs.analytics.userSessions,
    keyGenerator: (req) => {
      const { userId } = req.query;
      const cacheService = require('../services/cacheService');
      return cacheService.generateCacheKey(
        cacheService.config.keyPrefixes.sessions,
        userId
      );
    }
  }),
  
  // On-chain middlewares
  smartContracts: createCacheMiddleware({
    ...cacheConfigs.onchain.smartContracts,
    skipCache: false, // Enable for POST requests
    keyGenerator: (req) => {
      const { contractAddress, chainName } = req.body;
      return `onchain:contract:${chainName}:${contractAddress}`;
    }
  }),
  
  crossChain: createCacheMiddleware({
    ...cacheConfigs.onchain.crossChain,
    skipCache: false, // Enable for POST requests
    keyGenerator: (req) => {
      const { walletAddress } = req.body;
      return `onchain:crosschain:${walletAddress}`;
    }
  }),
  
  // Generic cache middleware for simple GET requests
  generic: (ttl = 300) => createCacheMiddleware({
    ttl,
    useL2: true,
    keyGenerator: (req) => {
      const params = { ...req.query, ...req.params };
      return `generic:${req.route.path}:${JSON.stringify(params)}`;
    }
  })
};

// Cache invalidation patterns for different operations
const invalidationPatterns = {
  analytics: {
    update: ['charts:*', 'analytics:*', 'traffic:*', 'stats:*'],
    userJourneys: ['journeys:*', 'analytics:*'],
    sessions: ['sessions:*', 'journeys:*']
  },
  
  onchain: {
    contracts: ['onchain:contract:*'],
    crosschain: ['onchain:crosschain:*'],
    transactions: ['onchain:*']
  },
  
  user: {
    profile: ['user:*'],
    teams: ['team:*', 'user:*'],
    websites: ['website:*', 'analytics:*']
  }
};

// Helper function to get cache statistics by category
function getCacheStatsByCategory() {
  const cacheService = require('../services/cacheService');
  const stats = cacheService.getStats();
  
  return {
    ...stats,
    configurations: cacheConfigs,
    categories: {
      analytics: Object.keys(cacheConfigs.analytics).length,
      onchain: Object.keys(cacheConfigs.onchain).length,
      user: Object.keys(cacheConfigs.user).length,
      ai: Object.keys(cacheConfigs.ai).length
    }
  };
}

// Helper function to warm cache for a specific site
async function warmSiteCache(siteId) {
  const cacheService = require('../services/cacheService');
  
  console.log(`🔥 Warming cache for site: ${siteId}`);
  
  const warmingOperations = [
    // Analytics cache warming
    {
      name: 'chart_data_daily',
      key: cacheService.generateCacheKey('charts:', siteId, { timeframe: 'daily' }),
      ttl: cacheConfigs.analytics.chartData.ttl
    },
    {
      name: 'chart_data_hourly',
      key: cacheService.generateCacheKey('charts:', siteId, { timeframe: 'hourly' }),
      ttl: cacheConfigs.analytics.chartData.ttl
    },
    {
      name: 'traffic_sources',
      key: cacheService.generateCacheKey('traffic:', siteId),
      ttl: cacheConfigs.analytics.trafficSources.ttl
    },
    {
      name: 'user_journeys',
      key: cacheService.generateCacheKey('journeys:', siteId),
      ttl: cacheConfigs.analytics.userJourneys.ttl
    }
  ];
  
  const results = [];
  for (const operation of warmingOperations) {
    try {
      // Set placeholder data for cache warming
      const placeholderData = {
        cached: true,
        timestamp: new Date(),
        operation: operation.name,
        siteId
      };
      
      await cacheService.set(operation.key, placeholderData, { 
        ttl: operation.ttl, 
        useL2: true 
      });
      
      results.push({ ...operation, success: true });
      console.log(`✅ Warmed cache: ${operation.name}`);
      
    } catch (error) {
      results.push({ ...operation, success: false, error: error.message });
      console.error(`❌ Failed to warm cache: ${operation.name}`, error);
    }
  }
  
  return {
    siteId,
    operations: results,
    successful: results.filter(r => r.success).length,
    total: results.length
  };
}

module.exports = {
  cacheConfigs,
  cacheMiddlewares,
  invalidationPatterns,
  getCacheStatsByCategory,
  warmSiteCache
};