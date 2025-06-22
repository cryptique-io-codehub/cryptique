const Analytics = require('../models/analytics');
const Session = require('../models/session');
const TimeseriesStat = require('../models/timeseriesStats');
const GranularEvent = require('../models/granularEvents');

class AnalyticsController {
  /**
   * Get analytics overview for a site
   */
  async getAnalyticsOverview(req, res) {
    try {
      const { siteId } = req.params;
      const { dateRange } = req.query;

      // Get main analytics data
      const analytics = await Analytics.findOne({ siteId });
      if (!analytics) {
        return res.status(404).json({ error: 'Analytics not found for this site' });
      }

      // Get session analytics for the date range
      const sessionAnalytics = await Session.getSessionAnalytics(siteId, dateRange);

      // Get time series data for trends
      const timeSeriesData = await this.getTimeSeriesData(siteId, dateRange);

      // Update summary metrics from current session data
      await Analytics.updateSummaryMetrics(siteId);

      const response = {
        siteId,
        summaryMetrics: analytics.summaryMetrics,
        conversionRate: analytics.conversionRate,
        sessionAnalytics: sessionAnalytics[0] || {},
        timeSeriesData,
        metadata: analytics.metadata,
        lastUpdated: analytics.updatedAt
      };

      res.json(response);
    } catch (error) {
      console.error('Error getting analytics overview:', error);
      res.status(500).json({ error: 'Failed to get analytics overview' });
    }
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeriesData(siteId, dateRange = {}) {
    try {
      const granularity = this.determineGranularity(dateRange);
      const { start, end } = this.parseDateRange(dateRange);

      const timeSeriesData = await TimeseriesStat.aggregateByPeriod(
        siteId,
        granularity,
        start,
        end
      );

      return {
        granularity,
        data: timeSeriesData,
        dateRange: { start, end }
      };
    } catch (error) {
      console.error('Error getting time series data:', error);
      return { granularity: 'hourly', data: [], dateRange: {} };
    }
  }

  /**
   * Get detailed session data
   */
  async getSessionData(req, res) {
    try {
      const { siteId } = req.params;
      const { 
        page = 1, 
        limit = 50, 
        sortBy = 'startTime', 
        sortOrder = 'desc',
        filters = {}
      } = req.query;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Build query
      const query = { siteId };
      
      if (filters.isWeb3User !== undefined) {
        query.isWeb3User = filters.isWeb3User === 'true';
      }
      
      if (filters.country) {
        query.country = filters.country;
      }
      
      if (filters.dateRange) {
        const { start, end } = this.parseDateRange(filters.dateRange);
        query.startTime = { $gte: start, $lte: end };
      }

      const sessions = await Session.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('-textContent -contentVector')
        .lean();

      const totalSessions = await Session.countDocuments(query);

      res.json({
        sessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSessions / limit),
          totalSessions,
          hasNextPage: skip + sessions.length < totalSessions,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error('Error getting session data:', error);
      res.status(500).json({ error: 'Failed to get session data' });
    }
  }

  /**
   * Get page analytics
   */
  async getPageAnalytics(req, res) {
    try {
      const { siteId } = req.params;
      const { dateRange } = req.query;

      const analytics = await Analytics.findOne({ siteId });
      if (!analytics) {
        return res.status(404).json({ error: 'Analytics not found' });
      }

      // Get page view data from analytics
      const pageViews = Object.fromEntries(analytics.pageViews);
      
      // Get entry and exit pages
      const entryPages = Object.fromEntries(analytics.entryPages);
      const exitPages = Object.fromEntries(analytics.exitPages);

      // Get session-based page analytics
      const { start, end } = this.parseDateRange(dateRange);
      const pageSessionData = await Session.aggregate([
        {
          $match: {
            siteId,
            ...(start && end ? { startTime: { $gte: start, $lte: end } } : {})
          }
        },
        {
          $unwind: '$visitedPages'
        },
        {
          $group: {
            _id: '$visitedPages.path',
            sessions: { $sum: 1 },
            totalDuration: { $sum: '$visitedPages.duration' },
            bounces: { 
              $sum: { 
                $cond: [
                  { $and: ['$visitedPages.isEntry', '$visitedPages.isExit'] }, 
                  1, 
                  0
                ] 
              }
            },
            avgDuration: { $avg: '$visitedPages.duration' }
          }
        },
        {
          $addFields: {
            bounceRate: {
              $cond: [
                { $gt: ['$sessions', 0] },
                { $multiply: [{ $divide: ['$bounces', '$sessions'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { sessions: -1 } },
        { $limit: 100 }
      ]);

      res.json({
        pageViews,
        entryPages,
        exitPages,
        pageSessionData,
        totalPages: Object.keys(pageViews).length
      });
    } catch (error) {
      console.error('Error getting page analytics:', error);
      res.status(500).json({ error: 'Failed to get page analytics' });
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(req, res) {
    try {
      const { siteId } = req.params;
      const { eventType, pagePath, dateRange, limit = 100 } = req.query;

      const options = {
        eventType,
        pagePath,
        dateRange: this.parseDateRange(dateRange),
        limit: parseInt(limit)
      };

      const eventAnalytics = await GranularEvent.getEventAnalytics(siteId, options);

      // Get top events by type if eventType is specified
      let topEvents = [];
      if (eventType) {
        topEvents = await GranularEvent.getTopEventsByType(siteId, eventType, 10);
      }

      res.json({
        eventAnalytics,
        topEvents,
        filters: { eventType, pagePath, dateRange }
      });
    } catch (error) {
      console.error('Error getting event analytics:', error);
      res.status(500).json({ error: 'Failed to get event analytics' });
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(req, res) {
    try {
      const { siteId } = req.params;

      // Get latest time series data (last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const latestStats = await TimeseriesStat.find({
        'metadata.siteId': siteId,
        'metadata.granularity': 'hourly',
        timestamp: { $gte: oneHourAgo }
      }).sort({ timestamp: -1 }).limit(12);

      // Get active sessions (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const activeSessions = await Session.countDocuments({
        siteId,
        lastActivity: { $gte: thirtyMinutesAgo }
      });

      // Get recent events (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentEvents = await GranularEvent.countDocuments({
        siteId,
        timestamp: { $gte: fiveMinutesAgo }
      });

      res.json({
        activeSessions,
        recentEvents,
        hourlyTrend: latestStats.reverse(),
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      res.status(500).json({ error: 'Failed to get real-time analytics' });
    }
  }

  /**
   * Update analytics data (for SDK integration)
   */
  async updateAnalytics(req, res) {
    try {
      const { siteId } = req.body;
      
      if (!siteId) {
        return res.status(400).json({ error: 'siteId is required' });
      }

      // Update summary metrics from current session data
      const updatedStats = await Analytics.updateSummaryMetrics(siteId);

      res.json({
        success: true,
        updatedStats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating analytics:', error);
      res.status(500).json({ error: 'Failed to update analytics' });
    }
  }

  /**
   * Helper methods
   */
  determineGranularity(dateRange) {
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return 'hourly';
    }

    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return 'hourly';
    if (diffDays <= 30) return 'daily';
    if (diffDays <= 90) return 'weekly';
    return 'monthly';
  }

  parseDateRange(dateRange) {
    if (!dateRange) {
      // Default to last 24 hours
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return { start, end };
    }

    if (typeof dateRange === 'string') {
      try {
        const parsed = JSON.parse(dateRange);
        return {
          start: new Date(parsed.start),
          end: new Date(parsed.end)
        };
      } catch {
        // If parsing fails, return default
        const end = new Date();
        const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        return { start, end };
      }
    }

    return {
      start: dateRange.start ? new Date(dateRange.start) : new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: dateRange.end ? new Date(dateRange.end) : new Date()
    };
  }
}

module.exports = new AnalyticsController(); 