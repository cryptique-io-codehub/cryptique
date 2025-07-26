/**
 * Statistics Aggregation Service
 * Pre-computes and caches analytics statistics for faster dashboard loading
 */

const AggregatedStats = require('../models/aggregatedStats');
const Analytics = require('../models/analytics');
const Session = require('../models/session');
const cacheService = require('./cacheService');
const queryOptimizer = require('./queryOptimizer');

class StatsAggregationService {
  constructor() {
    this.isProcessing = new Set(); // Track sites being processed
    console.log('🚀 StatsAggregationService initialized');
  }

  /**
   * Aggregate statistics for a site and timeframe
   * @param {string} siteId - Site ID
   * @param {string} timeframe - Time period (hourly, daily, weekly, monthly)
   * @param {Date} timestamp - Timestamp for the aggregation period
   * @returns {Promise<Object>} Aggregation result
   */
  async aggregateStats(siteId, timeframe, timestamp) {
    const processingKey = `${siteId}:${timeframe}:${timestamp.getTime()}`;
    
    if (this.isProcessing.has(processingKey)) {
      console.log(`⏭️ Aggregation already in progress for ${processingKey}`);
      return { success: false, message: 'Already processing' };
    }

    this.isProcessing.add(processingKey);
    const startTime = Date.now();

    try {
      console.log(`📊 Starting stats aggregation for ${siteId} (${timeframe}) at ${timestamp}`);

      // Check if aggregation already exists
      const existing = await AggregatedStats.findOne({
        siteId,
        timeframe,
        timestamp
      });

      if (existing) {
        console.log(`✅ Aggregation already exists for ${processingKey}`);
        return { success: true, existing: true, stats: existing };
      }

      // Get time range for this aggregation period
      const timeRange = this.getTimeRange(timeframe, timestamp);
      
      // Aggregate core metrics
      const coreMetrics = await this.aggregateCoreMetrics(siteId, timeRange);
      
      // Aggregate traffic sources
      const trafficSources = await this.aggregateTrafficSources(siteId, timeRange);
      
      // Aggregate top pages
      const topPages = await this.aggregateTopPages(siteId, timeRange);
      
      // Aggregate device and browser data
      const deviceBrowser = await this.aggregateDeviceBrowser(siteId, timeRange);
      
      // Aggregate geographic data
      const geographic = await this.aggregateGeographic(siteId, timeRange);
      
      // Aggregate user journey metrics
      const userJourneyMetrics = await this.aggregateUserJourneys(siteId, timeRange);

      // Create aggregated stats document
      const aggregatedStats = new AggregatedStats({
        siteId,
        timeframe,
        timestamp,
        metrics: coreMetrics,
        trafficSources: trafficSources.slice(0, 10), // Top 10 sources
        topPages: topPages.slice(0, 20), // Top 20 pages
        deviceBreakdown: deviceBrowser.devices,
        browserBreakdown: deviceBrowser.browsers,
        countryBreakdown: geographic.slice(0, 15), // Top 15 countries
        userJourneyMetrics,
        userSegments: await this.aggregateUserSegments(siteId, timeRange),
        dataPoints: coreMetrics.totalSessions || 0,
        processingTime: Date.now() - startTime
      });

      await aggregatedStats.save();

      // Cache the result
      const cacheKey = cacheService.generateCacheKey(
        'aggregated:stats',
        siteId,
        { timeframe, timestamp: timestamp.getTime() }
      );
      
      await cacheService.set(cacheKey, aggregatedStats.toObject(), { 
        ttl: 3600, // 1 hour cache
        useL2: true 
      });

      console.log(`✅ Stats aggregation completed for ${siteId} (${timeframe}) in ${Date.now() - startTime}ms`);

      return {
        success: true,
        stats: aggregatedStats,
        processingTime: Date.now() - startTime,
        dataPoints: coreMetrics.totalSessions || 0
      };

    } catch (error) {
      console.error(`❌ Stats aggregation failed for ${processingKey}:`, error);
      return {
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    } finally {
      this.isProcessing.delete(processingKey);
    }
  }

  /**
   * Aggregate core metrics
   */
  async aggregateCoreMetrics(siteId, timeRange) {
    const pipeline = [
      {
        $match: {
          siteId,
          startTime: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          totalPageViews: { $sum: '$pagesViewed' },
          totalDuration: { $sum: '$duration' },
          bounces: { $sum: { $cond: ['$isBounce', 1, 0] } },
          web3Users: { $sum: { $cond: ['$isWeb3User', 1, 0] } },
          walletsConnected: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$wallet.walletAddress', ''] },
                    { $ne: ['$wallet.walletAddress', null] },
                    { $ne: ['$wallet.walletAddress', 'No Wallet Detected'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          visitors: '$totalSessions',
          uniqueVisitors: { $size: '$uniqueUsers' },
          pageViews: '$totalPageViews',
          walletsConnected: '$walletsConnected',
          web3Users: '$web3Users',
          bounceRate: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $multiply: [{ $divide: ['$bounces', '$totalSessions'] }, 100] },
              0
            ]
          },
          avgSessionDuration: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $divide: ['$totalDuration', '$totalSessions'] },
              0
            ]
          },
          conversionRate: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $multiply: [{ $divide: ['$walletsConnected', '$totalSessions'] }, 100] },
              0
            ]
          },
          totalSessions: 1
        }
      }
    ];

    const result = await Session.aggregate(pipeline);
    const metrics = result[0] || {};

    // Calculate new vs returning visitors
    const returningVisitors = await this.getReturningVisitors(siteId, timeRange);
    
    return {
      visitors: metrics.visitors || 0,
      uniqueVisitors: metrics.uniqueVisitors || 0,
      pageViews: metrics.pageViews || 0,
      walletsConnected: metrics.walletsConnected || 0,
      web3Users: metrics.web3Users || 0,
      bounceRate: Math.round((metrics.bounceRate || 0) * 100) / 100,
      avgSessionDuration: Math.round((metrics.avgSessionDuration || 0) * 100) / 100,
      conversionRate: Math.round((metrics.conversionRate || 0) * 100) / 100,
      newVisitors: (metrics.uniqueVisitors || 0) - returningVisitors,
      returningVisitors,
      totalSessions: metrics.totalSessions || 0
    };
  }

  /**
   * Aggregate traffic sources
   */
  async aggregateTrafficSources(siteId, timeRange) {
    const pipeline = [
      {
        $match: {
          siteId,
          startTime: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ['$utmData.source', null] },
              '$utmData.source',
              {
                $cond: [
                  { $ne: ['$referrer', null] },
                  { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ['$referrer', '://'] }, 1] }, '/'] }, 0] },
                  'Direct'
                ]
              }
            ]
          },
          visitors: { $sum: 1 },
          wallets: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$wallet.walletAddress', ''] },
                    { $ne: ['$wallet.walletAddress', null] },
                    { $ne: ['$wallet.walletAddress', 'No Wallet Detected'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          source: '$_id',
          visitors: 1,
          wallets: 1
        }
      },
      { $sort: { visitors: -1 } },
      { $limit: 20 }
    ];

    const sources = await Session.aggregate(pipeline);
    const totalVisitors = sources.reduce((sum, source) => sum + source.visitors, 0);

    return sources.map(source => ({
      source: source.source || 'Unknown',
      visitors: source.visitors,
      wallets: source.wallets,
      percentage: totalVisitors > 0 ? Math.round((source.visitors / totalVisitors) * 10000) / 100 : 0
    }));
  }

  /**
   * Aggregate top pages
   */
  async aggregateTopPages(siteId, timeRange) {
    const pipeline = [
      {
        $match: {
          siteId,
          startTime: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      { $unwind: '$visitedPages' },
      {
        $group: {
          _id: '$visitedPages.path',
          views: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$userId' },
          totalDuration: { $sum: '$visitedPages.duration' },
          bounces: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$visitedPages.isEntry', true] },
                    { $eq: ['$visitedPages.isExit', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          path: '$_id',
          views: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
          avgDuration: {
            $cond: [
              { $gt: ['$views', 0] },
              { $divide: ['$totalDuration', '$views'] },
              0
            ]
          },
          bounceRate: {
            $cond: [
              { $gt: ['$views', 0] },
              { $multiply: [{ $divide: ['$bounces', '$views'] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 25 }
    ];

    const pages = await Session.aggregate(pipeline);
    
    return pages.map(page => ({
      path: page.path,
      views: page.views,
      uniqueVisitors: page.uniqueVisitors,
      avgDuration: Math.round((page.avgDuration || 0) * 100) / 100,
      bounceRate: Math.round((page.bounceRate || 0) * 100) / 100
    }));
  }

  /**
   * Aggregate device and browser data
   */
  async aggregateDeviceBrowser(siteId, timeRange) {
    const pipeline = [
      {
        $match: {
          siteId,
          startTime: { $gte: timeRange.start, $lte: timeRange.end }
        }
      },
      {
        $group: {
          _id: null,
          devices: {
            $push: {
              $toLower: { $ifNull: ['$device.type', 'unknown'] }
            }
          },
          browsers: {
            $push: {
              $toLower: { $ifNull: ['$browser.name', 'unknown'] }
            }
          }
        }
      }
    ];

    const result = await Session.aggregate(pipeline);
    const data = result[0] || { devices: [], browsers: [] };

    // Count devices
    const deviceCounts = {};
    data.devices.forEach(device => {
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });

    // Count browsers
    const browserCounts = {};
    data.browsers.forEach(browser => {
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    return {
      devices: {
        desktop: deviceCounts.desktop || 0,
        mobile: deviceCounts.mobile || 0,
        tablet: deviceCounts.tablet || 0,
        unknown: deviceCounts.unknown || 0
      },
      browsers: {
        chrome: browserCounts.chrome || 0,
        firefox: browserCounts.firefox || 0,
        safari: browserCounts.safari || 0,
        edge: browserCounts.edge || 0,
        other: Object.keys(browserCounts).reduce((sum, key) => {
          if (!['chrome', 'firefox', 'safari', 'edge'].includes(key)) {
            return sum + browserCounts[key];
          }
          return sum;
        }, 0)
      }
    };
  }

  /**
   * Aggregate geographic data
   */
  async aggregateGeographic(siteId, timeRange) {
    const pipeline = [
      {
        $match: {
          siteId,
          startTime: { $gte: timeRange.start, $lte: timeRange.end },
          country: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$country',
          visitors: { $sum: 1 }
        }
      },
      {
        $project: {
          country: '$_id',
          visitors: 1
        }
      },
      { $sort: { visitors: -1 } },
      { $limit: 20 }
    ];

    const countries = await Session.aggregate(pipeline);
    const totalVisitors = countries.reduce((sum, country) => sum + country.visitors, 0);

    return countries.map(country => ({
      country: country.country,
      visitors: country.visitors,
      percentage: totalVisitors > 0 ? Math.round((country.visitors / totalVisitors) * 10000) / 100 : 0
    }));
  }

  /**
   * Aggregate user journey metrics
   */
  async aggregateUserJourneys(siteId, timeRange) {
    try {
      const analytics = await Analytics.findOne({ siteId });
      if (!analytics || !analytics.userJourneys) {
        return {
          totalJourneys: 0,
          avgSessions: 0,
          avgTimeSpent: 0,
          avgPageViews: 0,
          conversionRate: 0,
          avgDaysToConversion: 0
        };
      }

      // Filter journeys by time range
      const filteredJourneys = analytics.userJourneys.filter(journey => {
        const lastVisit = new Date(journey.lastVisit);
        return lastVisit >= timeRange.start && lastVisit <= timeRange.end;
      });

      if (filteredJourneys.length === 0) {
        return {
          totalJourneys: 0,
          avgSessions: 0,
          avgTimeSpent: 0,
          avgPageViews: 0,
          conversionRate: 0,
          avgDaysToConversion: 0
        };
      }

      const totalJourneys = filteredJourneys.length;
      const convertedJourneys = filteredJourneys.filter(j => j.hasConverted);

      return {
        totalJourneys,
        avgSessions: Math.round((filteredJourneys.reduce((sum, j) => sum + j.totalSessions, 0) / totalJourneys) * 100) / 100,
        avgTimeSpent: Math.round((filteredJourneys.reduce((sum, j) => sum + j.totalTimeSpent, 0) / totalJourneys) * 100) / 100,
        avgPageViews: Math.round((filteredJourneys.reduce((sum, j) => sum + j.totalPageViews, 0) / totalJourneys) * 100) / 100,
        conversionRate: Math.round((convertedJourneys.length / totalJourneys) * 10000) / 100,
        avgDaysToConversion: convertedJourneys.length > 0 
          ? Math.round((convertedJourneys.reduce((sum, j) => sum + (j.daysToConversion || 0), 0) / convertedJourneys.length) * 100) / 100
          : 0
      };
    } catch (error) {
      console.error('Error aggregating user journeys:', error);
      return {
        totalJourneys: 0,
        avgSessions: 0,
        avgTimeSpent: 0,
        avgPageViews: 0,
        conversionRate: 0,
        avgDaysToConversion: 0
      };
    }
  }

  /**
   * Aggregate user segments
   */
  async aggregateUserSegments(siteId, timeRange) {
    try {
      const analytics = await Analytics.findOne({ siteId });
      if (!analytics || !analytics.userJourneys) {
        return { converter: 0, engaged: 0, browser: 0, bounced: 0 };
      }

      // Filter journeys by time range
      const filteredJourneys = analytics.userJourneys.filter(journey => {
        const lastVisit = new Date(journey.lastVisit);
        return lastVisit >= timeRange.start && lastVisit <= timeRange.end;
      });

      const segments = { converter: 0, engaged: 0, browser: 0, bounced: 0 };
      
      filteredJourneys.forEach(journey => {
        const segment = journey.userSegment || 'browser';
        if (segments.hasOwnProperty(segment)) {
          segments[segment]++;
        } else {
          segments.browser++;
        }
      });

      return segments;
    } catch (error) {
      console.error('Error aggregating user segments:', error);
      return { converter: 0, engaged: 0, browser: 0, bounced: 0 };
    }
  }

  /**
   * Get returning visitors count
   */
  async getReturningVisitors(siteId, timeRange) {
    try {
      // Find users who had sessions before this time range
      const pipeline = [
        {
          $match: {
            siteId,
            startTime: { $lt: timeRange.start }
          }
        },
        {
          $group: {
            _id: '$userId'
          }
        },
        {
          $lookup: {
            from: 'sessions',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$userId', '$$userId'] },
                      { $eq: ['$siteId', siteId] },
                      { $gte: ['$startTime', timeRange.start] },
                      { $lte: ['$startTime', timeRange.end] }
                    ]
                  }
                }
              }
            ],
            as: 'currentPeriodSessions'
          }
        },
        {
          $match: {
            'currentPeriodSessions.0': { $exists: true }
          }
        },
        {
          $count: 'returningVisitors'
        }
      ];

      const result = await Session.aggregate(pipeline);
      return result[0]?.returningVisitors || 0;
    } catch (error) {
      console.error('Error calculating returning visitors:', error);
      return 0;
    }
  }

  /**
   * Get time range for aggregation period
   */
  getTimeRange(timeframe, timestamp) {
    const date = new Date(timestamp);
    let start, end;

    switch (timeframe) {
      case 'hourly':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
        end = new Date(start.getTime() + 60 * 60 * 1000 - 1);
        break;
      case 'daily':
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
        break;
      case 'weekly':
        const dayOfWeek = date.getDay();
        start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek);
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        break;
      case 'monthly':
        start = new Date(date.getFullYear(), date.getMonth(), 1);
        end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        throw new Error(`Invalid timeframe: ${timeframe}`);
    }

    return { start, end };
  }

  /**
   * Get aggregated stats with caching
   */
  async getAggregatedStats(siteId, timeframe, timestamp) {
    const cacheKey = cacheService.generateCacheKey(
      'aggregated:stats',
      siteId,
      { timeframe, timestamp: timestamp.getTime() }
    );

    return await cacheService.get(cacheKey, async () => {
      const stats = await AggregatedStats.findOne({
        siteId,
        timeframe,
        timestamp
      }).lean();

      return stats;
    }, { ttl: 3600, useL2: true });
  }

  /**
   * Schedule background aggregation for a site
   */
  async scheduleAggregation(siteId, timeframes = ['hourly', 'daily']) {
    const now = new Date();
    const results = [];

    for (const timeframe of timeframes) {
      try {
        const timestamp = this.getAggregationTimestamp(timeframe, now);
        const result = await this.aggregateStats(siteId, timeframe, timestamp);
        results.push({ timeframe, ...result });
      } catch (error) {
        console.error(`Error scheduling ${timeframe} aggregation for ${siteId}:`, error);
        results.push({ 
          timeframe, 
          success: false, 
          error: error.message 
        });
      }
    }

    return results;
  }

  /**
   * Get appropriate timestamp for aggregation
   */
  getAggregationTimestamp(timeframe, date = new Date()) {
    switch (timeframe) {
      case 'hourly':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() - 1);
      case 'daily':
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
      case 'weekly':
        const lastWeek = new Date(date.getTime() - 7 * 24 * 60 * 60 * 1000);
        const dayOfWeek = lastWeek.getDay();
        return new Date(lastWeek.getFullYear(), lastWeek.getMonth(), lastWeek.getDate() - dayOfWeek);
      case 'monthly':
        return new Date(date.getFullYear(), date.getMonth() - 1, 1);
      default:
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    }
  }
}

// Create singleton instance
const statsAggregationService = new StatsAggregationService();

module.exports = statsAggregationService;