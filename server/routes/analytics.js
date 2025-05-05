const express = require('express');
const router = express.Router();
const { generateAnalyticsData } = require('../services/analyticsService');
const { 
  getUserJourneys, 
  getUserSessions, 
  trackSession 
} = require('../services/userJourneyService');

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
router.get('/user-journeys', async (req, res) => {
  try {
    const { siteId, teamId, timeframe, page = 1, limit = 25 } = req.query;
    
    console.log("Received request for user journeys:", { siteId, teamId, timeframe, page, limit });
    
    // Use the service to get filtered and paginated user journeys
    const result = await getUserJourneys({ siteId, teamId, timeframe }, page, limit);
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching user journeys:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user journey data" 
    });
  }
});

// Get user sessions data
router.get('/user-sessions', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }
    
    console.log("Received request for user sessions:", { userId });
    
    // Use the service to get user sessions
    const result = await getUserSessions(userId);
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch user session data" 
    });
  }
});

// Track a new session or update an existing one
router.post('/track-session', async (req, res) => {
  try {
    const sessionData = req.body;
    
    if (!sessionData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Session data is required' 
      });
    }
    
    console.log("Received request to track session:", { 
      sessionId: sessionData.sessionId,
      userId: sessionData.userId
    });
    
    // Use the service to track the session
    const result = await trackSession(sessionData);
    
    res.json(result);
  } catch (error) {
    console.error("Error tracking session:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to track session" 
    });
  }
});

// Seed user journey data for testing and development
router.post('/seed-journey-data', async (req, res) => {
  try {
    const { UserJourney, Session } = require('../models/UserJourney');
    const { count = 30, siteId, teamId } = req.body;
    
    if (!siteId || !teamId) {
      return res.status(400).json({
        success: false,
        error: 'Site ID and Team ID are required'
      });
    }
    
    console.log(`Seeding ${count} user journeys for site: ${siteId}, team: ${teamId}`);
    
    // Generate and save user journeys
    const userJourneys = [];
    
    for (let i = 1; i <= count; i++) {
      const firstVisitDate = new Date();
      firstVisitDate.setDate(firstVisitDate.getDate() - Math.floor(Math.random() * 30));
      
      const lastVisitDate = new Date(firstVisitDate);
      lastVisitDate.setDate(lastVisitDate.getDate() + Math.floor(Math.random() * 15));
      
      const hasConverted = Math.random() > 0.5;
      const totalSessions = Math.floor(Math.random() * 10) + 1;
      
      const userJourney = new UserJourney({
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
      
      await userJourney.save();
      userJourneys.push(userJourney);
      
      // Generate sessions for this user
      const sessionCount = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < sessionCount; j++) {
        // Create session start time
        const sessionStartDate = new Date(firstVisitDate);
        sessionStartDate.setDate(sessionStartDate.getDate() + Math.floor(Math.random() * (lastVisitDate - firstVisitDate) / (1000 * 60 * 60 * 24)));
        sessionStartDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
        
        // Session duration between 1 and 60 minutes
        const sessionDuration = Math.floor(Math.random() * 3600) + 60;
        
        // Create random device info
        const deviceTypes = ['desktop', 'mobile', 'tablet'];
        const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
        const oss = ['Windows', 'macOS', 'iOS', 'Android'];
        
        // Create session
        const session = new Session({
          sessionId: `sess_${Date.now().toString(36)}_${j}`,
          userId: userJourney.userId,
          sessionNumber: j + 1,
          startTime: sessionStartDate,
          duration: sessionDuration,
          pagesViewed: Math.floor(Math.random() * 10) + 1,
          device: {
            type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
            browser: browsers[Math.floor(Math.random() * browsers.length)],
            os: oss[Math.floor(Math.random() * oss.length)]
          },
          wallet: hasConverted ? {
            walletAddress: `0x${[...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
            walletType: ['MetaMask', 'Coinbase Wallet', 'Phantom', 'WalletConnect'][Math.floor(Math.random() * 4)]
          } : {
            walletAddress: 'No Wallet Detected'
          },
          country: ['US', 'UK', 'CA', 'DE', 'FR', 'JP', 'IN'][Math.floor(Math.random() * 7)],
          siteId: siteId,
          teamId: teamId
        });
        
        await session.save();
      }
    }
    
    res.json({
      success: true,
      message: `Successfully seeded ${count} user journeys with sessions`,
      userJourneyCount: userJourneys.length
    });
  } catch (error) {
    console.error("Error seeding journey data:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to seed journey data" 
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

module.exports = router; 