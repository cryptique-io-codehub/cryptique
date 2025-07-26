const Analytics = require("../models/analytics");
const Session = require("../models/session");
const GranularEvent = require("../models/granularEvents");
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require("../models/stats");
const Website = require("../models/website");

// Controller to handle posting the countryName
exports.postAnalytics = async (req, res) => {
  try {
    const { payload, sessionData } = req.body;
    
    // Handle session data updates (from the SDK tracking)
    if (!payload && sessionData) {
      console.log("Processing session data update");
      const { siteId, wallet, sessionId, userId, pagesViewed, pageVisits, startTime, referrer, utmData } = sessionData;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
      }
      
      const analytics = await Analytics.findOne({ siteId: siteId });
      if (!analytics) {
        return res.status(404).json({ error: 'Analytics not found for this site ID' });
      }
      
      // Find existing session with this ID
      const existingSession = await Session.findOne({ sessionId: sessionId });
      
      // Negative values that indicate no wallet
      const noWalletPhrases = [
        'No Wallet Detected', 
        'No Wallet Connected', 
        'Not Connected', 
        'No Chain Detected', 
        'Error'
      ];
      
      // Handle wallet updates if present
      if (wallet && 
          wallet.walletAddress && 
          wallet.walletAddress.trim() !== '' && 
          !noWalletPhrases.includes(wallet.walletAddress) &&
          wallet.walletAddress.length > 10) {
        
        const newWallet = {
          walletAddress: wallet.walletAddress,
          walletType: wallet.walletType || "Unknown",
          chainName: wallet.chainName || "Unknown",
        };
        
        const walletExists = analytics.wallets.some(
          (w) => w.walletAddress === newWallet.walletAddress
        );

        if (!walletExists) {
          analytics.wallets.push(newWallet);
          analytics.walletsConnected += 1;
          await analytics.save();
        }

        // Update session with wallet data
        sessionData.wallet = newWallet;
      }
      
      // If session doesn't exist, create it
      if (!existingSession) {
        console.log("Creating new session:", sessionId);
        const newSession = new Session(sessionData);
        await newSession.save();
        
        // Add to analytics if not already there
        if (!analytics.sessions.includes(newSession._id)) {
          analytics.sessions.push(newSession._id);
          await analytics.save();
        }
        
        // Ensure this analytics record is connected to the website
        await ensureWebsiteConnection(siteId, analytics._id);
        
        return res.status(200).json({ 
          message: 'New session created',
          session: newSession 
        });
      } 
      // If session exists, update it properly
      else {
        console.log("Updating existing session:", sessionId);
        
        // Merge page visits arrays without duplicates
        let combinedPageVisits = existingSession.pageVisits || [];
        
        // Add new page visits from sessionData if they don't already exist
        if (sessionData.pageVisits && Array.isArray(sessionData.pageVisits)) {
          sessionData.pageVisits.forEach(newVisit => {
            // Check if this URL already exists in the combined list
            const exists = combinedPageVisits.some(
              existingVisit => existingVisit.url === newVisit.url
            );
            
            // Only add if it doesn't exist already
            if (!exists) {
              combinedPageVisits.push(newVisit);
            }
          });
        }
        
        // Ensure we keep the original startTime from the first page
        const originalStartTime = existingSession.startTime || sessionData.startTime;
        
        // Ensure we keep the original referrer from the first page
        const originalReferrer = existingSession.referrer || sessionData.referrer;
        
        // Ensure we keep the original UTM data from the first page
        const originalUtmData = existingSession.utmData || sessionData.utmData;
        
        // Calculate correct duration based on original startTime and current endTime
        let duration = 0;
        if (originalStartTime && sessionData.endTime) {
          const startDate = new Date(originalStartTime);
          const endDate = new Date(sessionData.endTime);
          duration = Math.round((endDate - startDate) / 1000);
        }
        
        // Update session data with correct values
        const updatedData = {
          ...sessionData,
          startTime: originalStartTime,
          referrer: originalReferrer,
          utmData: originalUtmData,
          pageVisits: combinedPageVisits,
          pagesViewed: combinedPageVisits.length,
          duration: duration
        };
        
        const updatedSession = await Session.findByIdAndUpdate(
          existingSession._id, 
          updatedData, 
          { new: true }
        );
        
        // Ensure this analytics record is connected to the website
        await ensureWebsiteConnection(siteId, analytics._id);
        
        return res.status(200).json({ 
          message: 'Session updated',
          session: updatedSession 
        });
      }
    }
    
    // Handle payload events
    if (payload) {
      console.log("Processing payload event:", payload.type);
      const { siteId, websiteUrl, userId, pagePath, sessionId, type, eventData } = payload;
      
      // Handle ELEMENT_CLICK event type
      if (type === 'ELEMENT_CLICK') {
        try {
          // Create a new granular event record
          const clickEvent = new GranularEvent({
            siteId,
            userId,
            sessionId,
            eventType: type,
            eventData,
            pagePath,
            timestamp: new Date()
          });
          
          await clickEvent.save();
          console.log(`Saved click event for ${siteId}, element: ${eventData.tagName}${eventData.dataId ? ` with data-id ${eventData.dataId}` : ''}`);
          
          return res.status(200).json({ 
            success: true, 
            message: "Click event recorded" 
          });
        } catch (error) {
          console.error("Error saving click event:", error);
          return res.status(500).json({ error: 'Error saving click event' });
        }
      }
      
      // Handle other event types (existing code)
      if (!siteId || !userId) {
        return res.status(400).json({ error: 'Site ID and User ID are required' });
      }

      const sanitizedPagePath = pagePath ? pagePath.replace(/\./g, "_") : "";
      const analytics = await Analytics.findOne({ siteId: siteId });
      
      if (!analytics) {
        // Create new analytics document
        const newAnalytics = new Analytics({
          siteId: siteId,
          websiteUrl: websiteUrl,
          userId: [userId],
          totalVisitors: 1,
          uniqueVisitors: 1,
          web3Visitors: payload.isWeb3User ? 1 : 0,
          walletsConnected: 0,
          pageViews: sanitizedPagePath ? { [sanitizedPagePath]: 1 } : {},
          sessions: [],
        });
        await newAnalytics.save();
        
        // Create stats documents with both metrics
        const statstoCreate = {
          siteId: siteId,
          analyticsSnapshot: [
            {
              analyticsId: newAnalytics._id,
              timestamp: new Date(),
              visitors: 1,
              web3Users: payload.isWeb3User ? 1 : 0,
              walletsConnected: 0,
              pageViews: 1
            }
          ],
          lastSnapshotAt: new Date(),
        };

        const newHourlyStats = new HourlyStats(statstoCreate);
        await newHourlyStats.save();
        const newDailyStats = new DailyStats(statstoCreate);
        await newDailyStats.save();
        const newWeeklyStats = new WeeklyStats(statstoCreate);
        await newWeeklyStats.save();
        const newMonthlyStats = new MonthlyStats(statstoCreate);
        await newMonthlyStats.save();
        
        newAnalytics.hourlyStats = newHourlyStats._id;
        newAnalytics.dailyStats = newDailyStats._id;
        newAnalytics.weeklyStats = newWeeklyStats._id;
        newAnalytics.monthlyStats = newMonthlyStats._id;
        await newAnalytics.save();
        
        // Connect the new analytics document to the website and auto-verify
        await ensureWebsiteConnection(siteId, newAnalytics._id, true);
        
        return res.status(200).json({ 
          message: "New analytics created", 
          analytics: newAnalytics 
        });
      } 
      
      // Update existing analytics document
      if (payload.isWeb3User) {
        const web3Index = analytics.web3UserId.findIndex(
          (id) => id === userId
        );
        if (web3Index === -1) {
          analytics.web3UserId.push(userId);
          analytics.web3Visitors += 1;
        }
      }

      if (!analytics.userId.includes(userId)) {
        analytics.userId.push(userId);
        analytics.uniqueVisitors += 1;
        analytics.totalVisitors += 1;
        if (sanitizedPagePath) {
          analytics.pageViews.set(
            sanitizedPagePath,
            (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
          );
        }
      } else {
        analytics.totalVisitors += 1;
        if (sanitizedPagePath) {
          analytics.pageViews.set(
            sanitizedPagePath,
            (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
          );
        }
      }
      
      analytics.totalPageViews = Array.from(analytics.pageViews.values()).reduce(
        (a, b) => a + b,
        0
      );
      analytics.newVisitors = analytics.userId.length;
      analytics.returningVisitors = analytics.totalVisitors - analytics.newVisitors;
      
      await analytics.save();
      
      // Ensure this analytics record is connected to the website
      await ensureWebsiteConnection(siteId, analytics._id);
      
      return res.status(200).json({ 
        message: "Analytics updated", 
        analytics 
      });
    }
    
    return res.status(400).json({ message: "Invalid request format" });
  } catch (e) {
    console.error("Error in postAnalytics:", e);
    res.status(500).json({ 
      message: "Error processing analytics data", 
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
};

// Helper function to ensure connection between website and analytics
async function ensureWebsiteConnection(siteId, analyticsId, autoVerify = false) {
  try {
    // Find the website with this siteId
    const website = await Website.findOne({ siteId: siteId });
    
    if (website) {
      // Check if the website already has this analytics ID
      if (!website.analytics || !website.analytics.equals(analyticsId)) {
        console.log(`Connecting analytics document ${analyticsId} to website ${siteId}`);
        
        // Set the analytics field and auto-verify if we've received data
        let updateData = { analytics: analyticsId };
        
        // Auto-verify if requested or if the website has data but isn't verified yet
        if (autoVerify && !website.isVerified) {
          console.log(`Auto-verifying website ${siteId} since analytics data exists`);
          updateData.isVerified = true;
        }
        
        // Update the website document
        await Website.findByIdAndUpdate(
          website._id,
          { $set: updateData },
          { new: true }
        );
      }
    } else {
      console.log(`Website with siteId ${siteId} not found, can't connect analytics`);
    }
  } catch (error) {
    console.error(`Error connecting analytics to website: ${error.message}`);
  }
}

// Replace the existing analytics fetching logic with optimized version
exports.getAnalytics = async (req, res) => {
  const { siteId } = req.params;
  const { 
    limit = 1000, 
    offset = 0, 
    dateRange = '30d',
    includeDetailedSessions = false 
  } = req.query;

  try {
    console.log(`Fetching optimized analytics for siteId: ${siteId}`);

    // Set timeout for database operations
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timeout')), 30000); // Reduced to 30 seconds
    });

    const analyticsPromise = async () => {
      // First, get basic analytics without sessions
      const analytics = await Analytics.findOne({ siteId: siteId })
        .select('-sessions') // Exclude sessions array
        .lean();

      if (!analytics) {
        return res.json({ message: "Analytics not found" });
      }

      // Calculate date range for session queries
      const now = new Date();
      let startDate;
      switch (dateRange) {
        case '1d':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Get aggregated session data instead of individual sessions
      const sessionAggregation = await Session.aggregate([
        {
          $match: {
            siteId: siteId,
            startTime: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            uniqueUsers: { $addToSet: "$userId" },
            totalPageViews: { $sum: "$pagesViewed" },
            totalDuration: { $sum: "$duration" },
            bounces: {
              $sum: {
                $cond: [{ $eq: ["$isBounce", true] }, 1, 0]
              }
            },
            web3Sessions: {
              $sum: {
                $cond: [{ $eq: ["$isWeb3User", true] }, 1, 0]
              }
            },
            countries: { $addToSet: "$country" },
            // Get sample sessions for detailed analysis if needed
            sampleSessions: {
              $push: {
                $cond: [
                  includeDetailedSessions,
                  {
                    sessionId: "$sessionId",
                    userId: "$userId",
                    startTime: "$startTime",
                    duration: "$duration",
                    pagesViewed: "$pagesViewed",
                    isBounce: "$isBounce",
                    isWeb3User: "$isWeb3User",
                    country: "$country",
                    wallet: "$wallet"
                  },
                  null
                ]
              }
            }
          }
        },
        {
          $project: {
            totalSessions: 1,
            uniqueVisitors: { $size: "$uniqueUsers" },
            totalPageViews: 1,
            avgDuration: {
              $cond: [
                { $gt: ["$totalSessions", 0] },
                { $divide: ["$totalDuration", "$totalSessions"] },
                0
              ]
            },
            bounceRate: {
              $cond: [
                { $gt: ["$totalSessions", 0] },
                { $multiply: [{ $divide: ["$bounces", "$totalSessions"] }, 100] },
                0
              ]
            },
            web3UserCount: "$web3Sessions",
            countries: 1,
            sampleSessions: {
              $cond: [
                includeDetailedSessions,
                { $slice: ["$sampleSessions", parseInt(limit)] },
                []
              ]
            }
          }
        }
      ]);

      const sessionStats = sessionAggregation[0] || {
        totalSessions: 0,
        uniqueVisitors: 0,
        totalPageViews: 0,
        avgDuration: 0,
        bounceRate: 0,
        web3UserCount: 0,
        countries: [],
        sampleSessions: []
      };

      // Get pre-computed stats in parallel
      const [hourlyStats, dailyStats, weeklyStats, monthlyStats] = await Promise.all([
        HourlyStats.findOne({ siteId }).select('analyticsSnapshot lastSnapshotAt').lean(),
        DailyStats.findOne({ siteId }).select('analyticsSnapshot lastSnapshotAt').lean(),
        WeeklyStats.findOne({ siteId }).select('analyticsSnapshot lastSnapshotAt').lean(),
        MonthlyStats.findOne({ siteId }).select('analyticsSnapshot lastSnapshotAt').lean()
      ]);

      // Combine optimized data
      const optimizedAnalytics = {
        ...analytics,
        // Override with fresh calculated values
        totalSessions: sessionStats.totalSessions,
        uniqueVisitors: sessionStats.uniqueVisitors,
        totalPageViews: sessionStats.totalPageViews,
        avgDuration: sessionStats.avgDuration,
        bounceRate: sessionStats.bounceRate,
        web3UsersCount: sessionStats.web3UserCount,
        
        // Provide minimal session data for compatibility
        sessions: sessionStats.sampleSessions,
        sessionSummary: {
          total: sessionStats.totalSessions,
          dateRange: dateRange,
          countries: sessionStats.countries
        },
        
        // Pre-computed stats
        hourlyStats,
        dailyStats,
        weeklyStats,
        monthlyStats,
        
        // Performance metadata
        optimized: true,
        queryTime: new Date().toISOString()
      };

      return res.status(200).json({ 
        message: "Optimized analytics fetched successfully", 
        analytics: optimizedAnalytics
      });
    };

    // Race between the analytics operation and timeout
    await Promise.race([analyticsPromise(), timeoutPromise]);

  } catch (e) {
    console.error("Error while fetching optimized analytics", e);
    
    // Handle timeout specifically
    if (e.message === 'Database operation timeout') {
      return res.status(408).json({ 
        message: "Request timeout - analytics data is taking too long to fetch", 
        error: "TIMEOUT" 
      });
    }
    
    res.status(500).json({ 
      message: "Error while fetching analytics", 
      error: e.message 
    });
  }
};

//add a cron job to update the analytics data every hour of entire website i have in my db
exports.updateHourlyAnalyticsStats = async (req,res) => {
  try {
    const allAnalytics = await Analytics.find({});

    for (const analytic of allAnalytics) {
      const { siteId, _id: analyticsId } = analytic;
      const hourlyStats = await HourlyStats.findOne({ siteId });
      const lastSnapshotAt = hourlyStats && hourlyStats.lastSnapshotAt;
      const lastSnapshotDate = new Date(lastSnapshotAt);
      const now = new Date();
      const roundedHour = new Date(now);  
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5;
      const alreadyUpdated = differenceInHours < 1;

      if (alreadyUpdated) continue;

      await HourlyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{
                analyticsId,
                timestamp: roundedHour,
                visitors: analytic.totalVisitors,
                web3Users: analytic.web3Visitors,
                walletsConnected: analytic.walletsConnected,
                pageViews: analytic.totalPageViews
              }],
              $sort: { timestamp: -1 },
              $slice: 24,
            },
          },
          $set: {
            lastSnapshotAt: roundedHour,
          },
        },
        { upsert: true }
      );
    }
    console.log("Analytics stats updated successfully");
    res.status(200).json({ message: "Analytics stats updated successfully" });
  } catch (error) {
    console.error("Error while updating analytics stats", error);
    res.status(500).json({ message: "Error while updating analytics stats", error: error.message });
  }
};

exports.updateDailyAnalyticsStats = async (req,res) => {
  try {
    const allAnalytics = await Analytics.find({});

    for (const analytic of allAnalytics) {
      const { siteId, _id: analyticsId } = analytic;
      const dailyStats = await DailyStats.findOne({ siteId });
      const lastSnapshotAt = dailyStats && dailyStats.lastSnapshotAt;
      const lastSnapshotDate = new Date(lastSnapshotAt);

      const now = new Date();
      const roundedHour = new Date(now);
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5;
      const alreadyUpdated = differenceInHours < 24;

      if (alreadyUpdated) continue;

      await DailyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{
                analyticsId,
                timestamp: roundedHour,
                visitors: analytic.totalVisitors,
                web3Users: analytic.web3Visitors,
                walletsConnected: analytic.walletsConnected,
                pageViews: analytic.totalPageViews
              }],
              $sort: { timestamp: -1 },
              $slice: 30,
            },
          },
          $set: {
            lastSnapshotAt: roundedHour,
          },
        },
        { upsert: true }
      );
    }
    console.log("Analytics stats updated successfully");
    res.status(200).json({ message: "Analytics stats updated successfully" });
  } catch (error) {
    console.error("Error while updating analytics stats", error);
    res.status(500).json({ message: "Error while updating analytics stats", error: error.message });
  }
};
exports.updateWeeklyAnalyticsStats = async (req,res) => {
  try {
    const allAnalytics = await Analytics.find({});

    for (const analytic of allAnalytics) {
      const { siteId, _id: analyticsId } = analytic;
      const hourlyStats = await WeeklyStats.findOne({ siteId });
      const lastSnapshotAt = hourlyStats && hourlyStats.lastSnapshotAt;
      const lastSnapshotDate = new Date(lastSnapshotAt);

      const now = new Date();
      const roundedHour = new Date(now);
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5; // Convert milliseconds to hours
    
      const alreadyUpdated = differenceInHours < (24*7); // Check if the last snapshot was taken in the last week


      if (alreadyUpdated) continue;

      await WeeklyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{ analyticsId, hour: roundedHour }],
              $sort: { hour: -1 },
              $slice: 15,
            },
          },
        },
        { upsert: true }
      );
      await WeeklyStats.updateOne(
        { siteId },
        {
          $set: {
            lastSnapshotAt: roundedHour,
          },
        }
      );
    }
    console.log("Analytics stats updated successfully");
    res.status(200).json({ message: "Analytics stats updated successfully" });
  } catch (error) {
    console.error("Error while updating analytics stats", error);
    res.status(500).json({ message: "Error while updating analytics stats", error: error.message });
  }
}
exports.updateMonthlyAnalyticsStats = async (req,res) => {
  try {
    const allAnalytics = await Analytics.find({});

    for (const analytic of allAnalytics) {
      const { siteId, _id: analyticsId } = analytic;
      const hourlyStats = await MonthlyStats.findOne({ siteId });
      const lastSnapshotAt = hourlyStats && hourlyStats.lastSnapshotAt;
      const lastSnapshotDate = new Date(lastSnapshotAt);

      const now = new Date();
      const roundedHour = new Date(now);
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5; // Convert milliseconds to hours
      const alreadyUpdated = differenceInHours < (24*30); // Check if the last snapshot was taken in the last hour

      if (alreadyUpdated) continue;

      await MonthlyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{ analyticsId, hour: roundedHour }],
              $sort: { hour: -1 },
              $slice: 12,
            },
          },
        },
        { upsert: true }
      );
      await MonthlyStats.updateOne(
        { siteId },
        {
          $set: {
            lastSnapshotAt: roundedHour,
          },
        }
      );
    }
    console.log("Analytics stats updated successfully");
    res.status(200).json({ message: "Analytics stats updated successfully" });
  } catch (error) {
    console.error("Error while updating analytics stats", error);
    res.status(500).json({ message: "Error while updating analytics stats", error: error.message });
  }
};

// New endpoint to fetch click events
exports.getClickEvents = async (req, res) => {
  try {
    const { siteId, pagePath } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }
    
    // Build query
    const query = {
      siteId,
      eventType: 'ELEMENT_CLICK'
    };
    
    // Add page path filter if provided
    if (pagePath) {
      query.pagePath = pagePath;
    }
    
    // Get click events from database
    const clickEvents = await GranularEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(100); // Limit to prevent large responses
    
    return res.status(200).json({ 
      success: true,
      clickEvents 
    });
  } catch (error) {
    console.error("Error fetching click events:", error);
    return res.status(500).json({ error: 'Error fetching click events' });
  }
};


