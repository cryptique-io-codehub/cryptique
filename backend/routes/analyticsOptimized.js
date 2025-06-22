const express = require('express');
const router = express.Router();
const cors = require('cors');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Configure CORS for analytics endpoints
const corsOptions = {
  origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Middleware to ensure CORS headers are set
const setCorsHeaders = (req, res, next) => {
  const origin = req.headers.origin;
  if (corsOptions.origin.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
  next();
};

// Apply CORS and headers middleware
router.use(cors(corsOptions));
router.use(setCorsHeaders);

// Handle preflight requests
router.options('*', (req, res) => {
  res.status(204).end();
});

// ============= NEW OPTIMIZED ANALYTICS ENDPOINTS =============

// Analytics overview - main dashboard data
router.get('/overview/:siteId', authMiddleware, analyticsController.getAnalyticsOverview);

// Session data with filtering and pagination
router.get('/sessions/:siteId', authMiddleware, analyticsController.getSessionData);

// Page analytics - page views, entry/exit pages
router.get('/pages/:siteId', authMiddleware, analyticsController.getPageAnalytics);

// Event analytics - granular event tracking
router.get('/events/:siteId', authMiddleware, analyticsController.getEventAnalytics);

// Real-time analytics - live data
router.get('/realtime/:siteId', authMiddleware, analyticsController.getRealTimeAnalytics);

// Update analytics - trigger recalculation
router.post('/update', authMiddleware, analyticsController.updateAnalytics);

// ============= LEGACY ENDPOINTS (for backward compatibility) =============

// Legacy chart data endpoint
router.get('/chart', authMiddleware, async (req, res) => {
  try {
    const { siteId, timeframe, start, end } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    // Redirect to new time series endpoint
    const dateRange = {};
    if (start) dateRange.start = start;
    if (end) dateRange.end = end;

    const timeSeriesData = await analyticsController.getTimeSeriesData(siteId, dateRange);
    
    // Format response to match legacy format
    const chartData = timeSeriesData.data.map(item => ({
      timestamp: item._id,
      visitors: item.totalVisitors,
      web3Users: item.totalWeb3Users,
      pageViews: item.totalPageViews,
      walletsConnected: item.totalWalletsConnected
    }));

    res.json({
      success: true,
      data: chartData,
      granularity: timeSeriesData.granularity
    });
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Legacy traffic sources endpoint
router.get('/traffic-sources', authMiddleware, async (req, res) => {
  try {
    const { siteId, start, end } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const Session = require('../models/session');
    
    // Build date filter
    const dateFilter = { siteId };
    if (start && end) {
      dateFilter.startTime = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    // Aggregate traffic sources from sessions
    const trafficSources = await Session.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            source: '$utmData.source',
            medium: '$utmData.medium'
          },
          sessions: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' },
          web3Sessions: {
            $sum: { $cond: [{ $eq: ['$isWeb3User', true] }, 1, 0] }
          }
        }
      },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
          source: { $ifNull: ['$_id.source', 'direct'] },
          medium: { $ifNull: ['$_id.medium', 'none'] }
        }
      },
      { $sort: { sessions: -1 } },
      { $limit: 20 }
    ]);

    res.json({ sources: trafficSources });
  } catch (error) {
    console.error('Error getting traffic sources:', error);
    res.status(500).json({ error: 'Failed to get traffic sources' });
  }
});

// Legacy user sessions endpoint
router.get('/user-sessions', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const Session = require('../models/session');
    
    // Get all sessions for this user
    const sessions = await Session.find({ userId })
      .sort({ startTime: -1 })
      .limit(50)
      .select('-textContent -contentVector'); // Exclude vector fields
    
    res.json({ 
      success: true,
      sessions 
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

// Legacy user journeys endpoint (simplified for Phase 1)
router.get('/user-journeys', authMiddleware, async (req, res) => {
  try {
    const { siteId, timeframe } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const Session = require('../models/session');
    
    // Build date filter based on timeframe
    const dateFilter = { siteId };
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      if (startDate) {
        dateFilter.startTime = { $gte: startDate };
      }
    }

    // Get user journey data from sessions
    const userJourneys = await Session.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$userId',
          firstVisit: { $min: '$startTime' },
          lastVisit: { $max: '$startTime' },
          totalSessions: { $sum: 1 },
          totalPageViews: { $sum: '$pagesViewed' },
          totalTimeSpent: { $sum: '$duration' },
          hasConverted: { $max: '$isWeb3User' },
          countries: { $addToSet: '$country' },
          browsers: { $addToSet: '$browser.name' }
        }
      },
      {
        $addFields: {
          daysToConversion: {
            $cond: [
              { $eq: ['$hasConverted', true] },
              {
                $divide: [
                  { $subtract: ['$lastVisit', '$firstVisit'] },
                  1000 * 60 * 60 * 24
                ]
              },
              null
            ]
          },
          avgTimePerSession: {
            $cond: [
              { $gt: ['$totalSessions', 0] },
              { $divide: ['$totalTimeSpent', '$totalSessions'] },
              0
            ]
          }
        }
      },
      { $sort: { lastVisit: -1 } },
      { $limit: 100 }
    ]);

    res.json({ 
      success: true,
      userJourneys,
      totalJourneys: userJourneys.length
    });
  } catch (error) {
    console.error('Error getting user journeys:', error);
    res.status(500).json({ error: 'Failed to get user journeys' });
  }
});

module.exports = router; 