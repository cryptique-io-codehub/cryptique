const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');

// Get chart data
router.get('/chart', (req, res) => {
  const { siteId = 'test-site-1', timeframe = 'daily' } = req.query;
  
  // Create SDK data structure based on the provided example
  const sdkData = {
    newVisitors: 3, // From the example
    totalPageViews: 5, // From the example
    walletsConnected: 1, // From the example
    sessions: [
      "67fb882a207715d4d5acc73a",
      "67fb885fa3530203fd9302ef",
      "67fb88b38c52adc0d7bfde43",
      "67fb88ce8c52adc0d7bfde68",
      "67fb8adcf940f2a429170d6f"
    ],
    userAgents: [],
    userId: ['usr_92e4zknbo', 'usr_0n4i0gcej', 'usr_l5s5fpbx4'],
    web3UserId: ['usr_l5s5fpbx4'],
    websiteUrl: "https://cashtrek.org/"
  };
  
  // Process the data with 15-minute aggregation
  const processedData = generateAnalyticsData(sdkData);
  
  res.json(processedData);
});

// Get user journeys data
router.get('/user-journeys', (req, res) => {
  const { siteId, teamId, timeframe, page = 1, limit = 25 } = req.query;
  
  // Generate mock user journey data
  const generateMockUserJourneys = () => {
    const userCount = 35; // More than the limit to test pagination
    const journeys = [];
    
    for (let i = 1; i <= userCount; i++) {
      const firstVisitDate = new Date();
      firstVisitDate.setDate(firstVisitDate.getDate() - Math.floor(Math.random() * 30));
      
      const lastVisitDate = new Date(firstVisitDate);
      lastVisitDate.setDate(lastVisitDate.getDate() + Math.floor(Math.random() * 15));
      
      const hasConverted = Math.random() > 0.5;
      const totalSessions = Math.floor(Math.random() * 10) + 1;
      
      journeys.push({
        userId: `user_${i}_${Date.now().toString(36)}`,
        firstVisit: firstVisitDate,
        lastVisit: lastVisitDate,
        totalSessions: totalSessions,
        totalPageViews: Math.floor(Math.random() * 50) + 1,
        totalTimeSpent: Math.floor(Math.random() * 7200) + 300, // 5 min to 2 hrs in seconds
        hasConverted: hasConverted,
        daysToConversion: hasConverted ? Math.floor(Math.random() * 10) + 1 : null,
        userSegment: hasConverted ? 'converter' : ['engaged', 'bounced', 'browser'][Math.floor(Math.random() * 3)],
        acquisitionSource: ['google/organic', 'facebook/social', 'twitter/social', 'direct'][Math.floor(Math.random() * 4)],
        sessionsBeforeConversion: hasConverted ? Math.floor(Math.random() * totalSessions) + 1 : null,
        teamId: teamId,
        siteId: siteId,
        websiteName: "Demo Website",
        websiteDomain: "example.com"
      });
    }
    
    return journeys;
  };
  
  // Generate data
  const allJourneys = generateMockUserJourneys();
  
  // Apply filters
  let filteredJourneys = [...allJourneys];
  
  // Filter by siteId
  if (siteId) {
    filteredJourneys = filteredJourneys.filter(journey => journey.siteId === siteId);
  }
  
  // Filter by teamId 
  if (teamId) {
    filteredJourneys = filteredJourneys.filter(journey => journey.teamId === teamId);
  }
  
  // Filter by timeframe
  if (timeframe && timeframe !== 'all') {
    const now = new Date();
    let cutoffDate = new Date();
    
    switch(timeframe) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(cutoffDate.getMonth() - 3);
        break;
      default:
        cutoffDate = new Date(0); // No filter
    }
    
    filteredJourneys = filteredJourneys.filter(journey => 
      new Date(journey.lastVisit) >= cutoffDate && new Date(journey.lastVisit) <= now
    );
  }
  
  // Calculate pagination
  const totalItems = filteredJourneys.length;
  const totalPages = Math.ceil(totalItems / limit);
  const pageNum = parseInt(page);
  const startIndex = (pageNum - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  // Get paginated data
  const paginatedJourneys = filteredJourneys.slice(startIndex, endIndex);
  
  // Send response
  res.json({
    success: true,
    userJourneys: paginatedJourneys,
    totalPages: totalPages,
    page: pageNum,
    totalItems: totalItems
  });
});

// Get user sessions data
router.get('/user-sessions', (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  // Generate mock sessions for a user
  const generateMockSessions = (userId) => {
    const sessionCount = Math.floor(Math.random() * 5) + 1;
    const sessions = [];
    
    // Generate session start date (30 days ago to today)
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - 30);
    
    for (let i = 0; i < sessionCount; i++) {
      // Create session start time, each more recent than the last
      const sessionStartDate = new Date(baseDate);
      sessionStartDate.setDate(sessionStartDate.getDate() + Math.floor(Math.random() * (30 - i * 5)));
      sessionStartDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
      
      // Session duration between 1 and 60 minutes
      const sessionDuration = Math.floor(Math.random() * 3600) + 60;
      
      // Pages viewed, between 1 and 10
      const pagesViewed = Math.floor(Math.random() * 10) + 1;
      
      // Generate visited pages
      const visitedPages = [];
      const possiblePaths = [
        '/', 
        '/about', 
        '/features', 
        '/pricing', 
        '/contact', 
        '/blog', 
        '/products',
        '/documentation',
        '/login',
        '/dashboard'
      ];
      
      for (let j = 0; j < pagesViewed; j++) {
        const path = possiblePaths[Math.floor(Math.random() * possiblePaths.length)];
        const pageTimestamp = new Date(sessionStartDate);
        pageTimestamp.setMinutes(pageTimestamp.getMinutes() + Math.floor(Math.random() * (sessionDuration / 60)));
        
        visitedPages.push({
          path,
          timestamp: pageTimestamp,
          duration: Math.floor(Math.random() * 300) + 10, // 10 seconds to 5 minutes
          isEntry: j === 0,
          isExit: j === pagesViewed - 1
        });
      }
      
      // Sort pages by timestamp
      visitedPages.sort((a, b) => a.timestamp - b.timestamp);
      
      // Create random device info
      const deviceTypes = ['desktop', 'mobile', 'tablet'];
      const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
      const oss = ['Windows', 'macOS', 'iOS', 'Android'];
      
      const device = {
        type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        os: oss[Math.floor(Math.random() * oss.length)]
      };
      
      // Determine if wallet is connected
      const hasWallet = Math.random() > 0.7;
      const wallet = hasWallet ? {
        walletAddress: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        walletType: ['MetaMask', 'Coinbase Wallet', 'Phantom', 'WalletConnect'][Math.floor(Math.random() * 4)],
        chainName: ['Ethereum', 'Polygon', 'Solana', 'Avalanche'][Math.floor(Math.random() * 4)]
      } : {
        walletAddress: 'No Wallet Detected',
        walletType: null,
        chainName: null
      };
      
      sessions.push({
        _id: `sess_${Date.now().toString(36)}_${i}`,
        userId,
        sessionNumber: i + 1,
        startTime: sessionStartDate,
        duration: sessionDuration,
        pagesViewed,
        visitedPages,
        device,
        wallet,
        country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'IN'][Math.floor(Math.random() * 7)],
        referrer: Math.random() > 0.5 ? ['google.com', 'facebook.com', 'twitter.com', 'linkedin.com'][Math.floor(Math.random() * 4)] : null,
        utmData: Math.random() > 0.7 ? {
          source: ['google', 'facebook', 'twitter', 'email'][Math.floor(Math.random() * 4)],
          medium: ['cpc', 'social', 'email', 'referral'][Math.floor(Math.random() * 4)],
          campaign: `campaign-${Math.floor(Math.random() * 5) + 1}`
        } : null
      });
    }
    
    return sessions;
  };
  
  // Generate and send response
  const sessions = generateMockSessions(userId);
  
  res.json({
    success: true,
    sessions
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 