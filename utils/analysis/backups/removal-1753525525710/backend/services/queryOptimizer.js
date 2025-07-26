/**
 * Query Optimizer Service
 * Provides optimized database queries with performance monitoring and caching
 */

const cacheService = require('./cacheService');
const Analytics = require('../models/analytics');
const Session = require('../models/session');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../models/stats');

class QueryOptimizer {
  constructor() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      queryTypes: {}
    };
    
    this.slowQueryThreshold = 1000; // 1 second
    console.log('🚀 QueryOptimizer initialized');
  }

  /**
   * Execute a query with performance monitoring and caching
   * @param {string} queryType - Type of query for statistics
   * @param {string} cacheKey - Cache key for the query
   * @param {Function} queryFunction - Function that executes the actual query
   * @param {Object} options - Query options
   * @returns {Promise<any>} Query result
   */
  async executeOptimizedQuery(queryType, cacheKey, queryFunction, options = {}) {
    const startTime = Date.now();
    const { ttl = 300, useCache = true, useL2 = true } = options;

    try {
      this.queryStats.totalQueries++;
      this.queryStats.queryTypes[queryType] = (this.queryStats.queryTypes[queryType] || 0) + 1;

      let result;
      
      if (useCache) {
        // Try to get from cache first
        result = await cacheService.get(cacheKey, async () => {
          console.log(`🔄 Cache miss for ${queryType}, executing database query`);
          return await queryFunction();
        }, { ttl, useL2 });
        
        if (result !== null) {
          this.queryStats.cachedQueries++;
        }
      } else {
        result = await queryFunction();
      }

      const executionTime = Date.now() - startTime;
      this.updateQueryStats(queryType, executionTime);

      if (executionTime > this.slowQueryThreshold) {
        console.warn(`⚠️ Slow query detected: ${queryType} took ${executionTime}ms`);
        this.queryStats.slowQueries++;
      }

      return result;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ Query failed: ${queryType} (${executionTime}ms)`, error);
      throw error;
    }
  }

  /**
   * Get optimized analytics summary
   * @param {string} siteId - Site ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Analytics summary
   */
  async getAnalyticsSummary(siteId, options = {}) {
    const cacheKey = cacheService.generateCacheKey(
      'analytics:summary',
      siteId,
      options
    );

    return await this.executeOptimizedQuery(
      'analytics_summary',
      cacheKey,
      async () => {
        // Use aggregation pipeline for better performance
        const pipeline = [
          { $match: { siteId } },
          {
            $project: {
              totalVisitors: 1,
              uniqueVisitors: 1,
              web3Visitors: 1,
              totalPageViews: 1,
              walletsConnected: 1,
              newVisitors: 1,
              returningVisitors: 1,
              avgSessionsPerUser: 1,
              crossDeviceUsers: 1,
              userJourneyCount: { $size: { $ifNull: ['$userJourneys', []] } },
              convertedUsers: {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$userJourneys', []] },
                    cond: { $eq: ['$$this.hasConverted', true] }
                  }
                }
              },
              userSegments: {
                $reduce: {
                  input: { $ifNull: ['$userJourneys', []] },
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this.userSegment', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this.userSegment', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              }
            }
          }
        ];

        const result = await Analytics.aggregate(pipeline);
        const data = result[0];

        if (!data) {
          return {
            totalVisitors: 0,
            uniqueVisitors: 0,
            web3Visitors: 0,
            totalPageViews: 0,
            walletsConnected: 0,
            newVisitors: 0,
            returningVisitors: 0,
            conversionRate: 0,
            avgSessionsPerUser: 0,
            crossDeviceUsers: 0,
            userSegments: {}
          };
        }

        const conversionRate = data.userJourneyCount > 0 
          ? (data.convertedUsers / data.userJourneyCount) * 100 
          : 0;

        return {
          totalVisitors: data.totalVisitors || 0,
          uniqueVisitors: data.uniqueVisitors || 0,
          web3Visitors: data.web3Visitors || 0,
          totalPageViews: data.totalPageViews || 0,
          walletsConnected: data.walletsConnected || 0,
          newVisitors: data.newVisitors || 0,
          returningVisitors: data.returningVisitors || 0,
          conversionRate: Math.round(conversionRate * 100) / 100,
          avgSessionsPerUser: data.avgSessionsPerUser || 0,
          crossDeviceUsers: data.crossDeviceUsers || 0,
          userSegments: data.userSegments || {}
        };
      },
      { ttl: 300, useL2: true }
    );
  }

  /**
   * Get optimized session analytics
   * @param {string} siteId - Site ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Session analytics
   */
  async getSessionAnalytics(siteId, options = {}) {
    const { timeframe = 'week', limit = 100 } = options;
    
    const cacheKey = cacheService.generateCacheKey(
      'analytics:sessions',
      siteId,
      { timeframe, limit }
    );

    return await this.executeOptimizedQuery(
      'session_analytics',
      cacheKey,
      async () => {
        const timeFilter = this.getTimeFilter(timeframe);
        
        const pipeline = [
          { 
            $match: { 
              siteId,
              ...(timeFilter.startTime && { startTime: timeFilter.startTime })
            }
          },
          {
            $group: {
              _id: null,
              totalSessions: { $sum: 1 },
              uniqueUsers: { $addToSet: '$userId' },
              avgDuration: { $avg: '$duration' },
              bounceRate: { $avg: { $cond: ['$isBounce', 1, 0] } },
              web3Sessions: { $sum: { $cond: ['$isWeb3User', 1, 0] } },
              avgPagesPerSession: { $avg: '$pagesViewed' },
              deviceTypes: {
                $push: '$device.type'
              },
              browsers: {
                $push: '$browser.name'
              },
              countries: {
                $push: '$country'
              }
            }
          },
          {
            $project: {
              totalSessions: 1,
              uniqueUsers: { $size: '$uniqueUsers' },
              avgDuration: { $round: ['$avgDuration', 2] },
              bounceRate: { $multiply: [{ $round: ['$bounceRate', 4] }, 100] },
              web3Sessions: 1,
              web3Rate: { 
                $multiply: [
                  { $divide: ['$web3Sessions', '$totalSessions'] }, 
                  100
                ]
              },
              avgPagesPerSession: { $round: ['$avgPagesPerSession', 2] },
              deviceBreakdown: {
                $reduce: {
                  input: '$deviceTypes',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              },
              browserBreakdown: {
                $reduce: {
                  input: '$browsers',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              },
              countryBreakdown: {
                $reduce: {
                  input: '$countries',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              }
            }
          }
        ];

        const result = await Session.aggregate(pipeline);
        return result[0] || {
          totalSessions: 0,
          uniqueUsers: 0,
          avgDuration: 0,
          bounceRate: 0,
          web3Sessions: 0,
          web3Rate: 0,
          avgPagesPerSession: 0,
          deviceBreakdown: {},
          browserBreakdown: {},
          countryBreakdown: {}
        };
      },
      { ttl: 600, useL2: true }
    );
  }

  /**
   * Get optimized page analytics
   * @param {string} siteId - Site ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Page analytics
   */
  async getPageAnalytics(siteId, options = {}) {
    const { limit = 20, timeframe = 'week' } = options;
    
    const cacheKey = cacheService.generateCacheKey(
      'analytics:pages',
      siteId,
      { limit, timeframe }
    );

    return await this.executeOptimizedQuery(
      'page_analytics',
      cacheKey,
      async () => {
        const timeFilter = this.getTimeFilter(timeframe);
        
        const pipeline = [
          { 
            $match: { 
              siteId,
              ...(timeFilter.startTime && { startTime: timeFilter.startTime })
            }
          },
          { $unwind: '$visitedPages' },
          {
            $group: {
              _id: '$visitedPages.path',
              views: { $sum: 1 },
              uniqueVisitors: { $addToSet: '$userId' },
              avgDuration: { $avg: '$visitedPages.duration' },
              entries: { $sum: { $cond: ['$visitedPages.isEntry', 1, 0] } },
              exits: { $sum: { $cond: ['$visitedPages.isExit', 1, 0] } }
            }
          },
          {
            $project: {
              path: '$_id',
              views: 1,
              uniqueVisitors: { $size: '$uniqueVisitors' },
              avgDuration: { $round: ['$avgDuration', 2] },
              entries: 1,
              exits: 1,
              exitRate: { 
                $cond: [
                  { $gt: ['$views', 0] },
                  { $multiply: [{ $divide: ['$exits', '$views'] }, 100] },
                  0
                ]
              }
            }
          },
          { $sort: { views: -1 } },
          { $limit: limit }
        ];

        return await Session.aggregate(pipeline);
      },
      { ttl: 900, useL2: true }
    );
  }

  /**
   * Get optimized user journey metrics
   * @param {string} siteId - Site ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User journey metrics
   */
  async getUserJourneyMetrics(siteId, options = {}) {
    const cacheKey = cacheService.generateCacheKey(
      'analytics:journey_metrics',
      siteId,
      options
    );

    return await this.executeOptimizedQuery(
      'user_journey_metrics',
      cacheKey,
      async () => {
        const pipeline = [
          { $match: { siteId } },
          { $unwind: '$userJourneys' },
          {
            $group: {
              _id: null,
              totalJourneys: { $sum: 1 },
              avgSessions: { $avg: '$userJourneys.totalSessions' },
              avgTimeSpent: { $avg: '$userJourneys.totalTimeSpent' },
              avgPageViews: { $avg: '$userJourneys.totalPageViews' },
              conversionRate: { $avg: { $cond: ['$userJourneys.hasConverted', 1, 0] } },
              avgDaysToConversion: { 
                $avg: { 
                  $cond: [
                    '$userJourneys.hasConverted',
                    '$userJourneys.daysToConversion',
                    null
                  ]
                }
              },
              segmentBreakdown: {
                $push: '$userJourneys.userSegment'
              },
              sourceBreakdown: {
                $push: '$userJourneys.acquisitionSource'
              }
            }
          },
          {
            $project: {
              totalJourneys: 1,
              avgSessions: { $round: ['$avgSessions', 2] },
              avgTimeSpent: { $round: ['$avgTimeSpent', 2] },
              avgPageViews: { $round: ['$avgPageViews', 2] },
              conversionRate: { $multiply: [{ $round: ['$conversionRate', 4] }, 100] },
              avgDaysToConversion: { $round: ['$avgDaysToConversion', 2] },
              segmentBreakdown: {
                $reduce: {
                  input: '$segmentBreakdown',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              },
              sourceBreakdown: {
                $reduce: {
                  input: '$sourceBreakdown',
                  initialValue: {},
                  in: {
                    $mergeObjects: [
                      '$$value',
                      {
                        $arrayToObject: [[{
                          k: { $ifNull: ['$$this', 'unknown'] },
                          v: { $add: [{ $ifNull: [{ $getField: { field: { $ifNull: ['$$this', 'unknown'] }, input: '$$value' } }, 0] }, 1] }
                        }]]
                      }
                    ]
                  }
                }
              }
            }
          }
        ];

        const result = await Analytics.aggregate(pipeline);
        return result[0] || {
          totalJourneys: 0,
          avgSessions: 0,
          avgTimeSpent: 0,
          avgPageViews: 0,
          conversionRate: 0,
          avgDaysToConversion: 0,
          segmentBreakdown: {},
          sourceBreakdown: {}
        };
      },
      { ttl: 1800, useL2: true }
    );
  }

  /**
   * Get time-based analytics with optimized aggregation
   * @param {string} siteId - Site ID
   * @param {string} timeframe - Time period
   * @returns {Promise<Array>} Time-based analytics
   */
  async getTimeBasedAnalytics(siteId, timeframe = 'daily') {
    const cacheKey = cacheService.generateCacheKey(
      'analytics:timebased',
      siteId,
      { timeframe }
    );

    return await this.executeOptimizedQuery(
      'time_based_analytics',
      cacheKey,
      async () => {
        const StatsModel = this.getStatsModel(timeframe);
        
        const pipeline = [
          { $match: { siteId } },
          { $unwind: '$analyticsSnapshot' },
          {
            $project: {
              timestamp: '$analyticsSnapshot.timestamp',
              visitors: '$analyticsSnapshot.visitors',
              walletsConnected: '$analyticsSnapshot.walletsConnected',
              pageViews: '$analyticsSnapshot.pageViews',
              web3Users: '$analyticsSnapshot.web3Users'
            }
          },
          { $sort: { timestamp: 1 } },
          { $limit: 100 } // Limit to last 100 data points
        ];

        return await StatsModel.aggregate(pipeline);
      },
      { ttl: 300, useL2: true }
    );
  }

  /**
   * Helper method to get appropriate stats model
   * @param {string} timeframe - Time period
   * @returns {Object} Mongoose model
   */
  getStatsModel(timeframe) {
    switch (timeframe.toLowerCase()) {
      case 'hourly': return HourlyStats;
      case 'daily': return DailyStats;
      case 'weekly': return WeeklyStats;
      case 'monthly': return MonthlyStats;
      default: return DailyStats;
    }
  }

  /**
   * Helper method to get time filter
   * @param {string} timeframe - Time period
   * @returns {Object} Time filter object
   */
  getTimeFilter(timeframe) {
    const now = new Date();
    let startTime;

    switch (timeframe) {
      case 'today':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'yesterday':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        startTime.setDate(startTime.getDate() - 1);
        break;
      case 'week':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        startTime.setDate(startTime.getDate() - 7);
        break;
      case 'month':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        startTime.setDate(startTime.getDate() - 30);
        break;
      case 'quarter':
        startTime = new Date(now.setHours(0, 0, 0, 0));
        startTime.setDate(startTime.getDate() - 90);
        break;
      default:
        return {};
    }

    return { startTime: { $gte: startTime } };
  }

  /**
   * Update query statistics
   * @param {string} queryType - Type of query
   * @param {number} executionTime - Execution time in ms
   */
  updateQueryStats(queryType, executionTime) {
    const totalQueries = this.queryStats.totalQueries;
    const currentAvg = this.queryStats.averageQueryTime;
    
    this.queryStats.averageQueryTime = 
      ((currentAvg * (totalQueries - 1)) + executionTime) / totalQueries;
  }

  /**
   * Get query performance statistics
   * @returns {Object} Query statistics
   */
  getQueryStats() {
    const cacheHitRate = this.queryStats.totalQueries > 0 
      ? (this.queryStats.cachedQueries / this.queryStats.totalQueries) * 100 
      : 0;

    return {
      ...this.queryStats,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueryRate: this.queryStats.totalQueries > 0 
        ? (this.queryStats.slowQueries / this.queryStats.totalQueries) * 100 
        : 0
    };
  }

  /**
   * Reset query statistics
   */
  resetStats() {
    this.queryStats = {
      totalQueries: 0,
      cachedQueries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
      queryTypes: {}
    };
  }
}

// Create singleton instance
const queryOptimizer = new QueryOptimizer();

module.exports = queryOptimizer;