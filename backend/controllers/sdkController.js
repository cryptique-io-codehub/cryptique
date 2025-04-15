const Analytics = require("../models/analytics");
const Session = require("../models/session");
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require("../models/stats");

// Controller to handle posting the countryName
exports.postAnalytics = async (req, res) => {
  try {
    const { payload, sessionData } = req.body;
    if (!payload && sessionData) {
      // console.log("sessionData", sessionData);
      const { siteId, wallet, sessionId, userId, pagesViewed, duration } = sessionData;
      const analytics = await Analytics.findOne({ siteId: siteId });
      
      if (!analytics) {
        return res.status(404).json({ error: 'Analytics not found for this site ID' });
      }
      
      // Check if session with this ID already exists
      const session = await Session.findOne({ sessionId: sessionId });
      
      // Handle wallet updates if present
      if (wallet && wallet.walletAddress && wallet.walletAddress.length > 0) {
        const newWallet = {
          walletAddress: wallet.walletAddress,
          walletType: wallet.walletType,
          chainName: wallet.chainName,
        };
        const walletExists = analytics.wallets.some(
          (w) => w.walletAddress === newWallet.walletAddress
        );

        if (!walletExists) {
          analytics.wallets.push(newWallet); // Add wallet address to the array if not already present
          analytics.walletsConnected += 1; // Increment wallets connected
          await analytics.save();
        }
      }

      // If session doesn't exist, create a new one
      if (!session) {
        const newSession = new Session(sessionData);
        await newSession.save();
        
        // Check if this session ID is already in analytics.sessions to avoid duplicates
        const sessionExists = await Analytics.findOne({
          siteId: siteId,
          sessions: newSession._id
        });
        
        if (!sessionExists) {
          analytics.sessions.push(newSession._id); // Add session to the analytics
          await analytics.save();
        }
        
        return res.status(200).json({ session: newSession });
      } 
      // If session exists, update it with the new data
      else {
        // Merge the session data - increment pages viewed
        const updatedPagesViewed = Math.max(session.pagesViewed || 0, pagesViewed || 0);
        
        // Combine page visits arrays without duplicates
        const combinedPageVisits = sessionData.pageVisits || [];
        
        // Update session data
        const updatedData = {
          ...sessionData,
          pagesViewed: updatedPagesViewed,
          // Only update endTime if it's later than current end time
          endTime: sessionData.endTime || session.endTime,
          // Set isBounce to false if more than one page is viewed
          isBounce: updatedPagesViewed <= 1,
          // Update wallet data if it exists in the new data
          wallet: {
            walletAddress: wallet?.walletAddress || session.wallet?.walletAddress || '',
            walletType: wallet?.walletType || session.wallet?.walletType || '',
            chainName: wallet?.chainName || session.wallet?.chainName || '',
          }
        };
        
        const updatedSession = await Session.findByIdAndUpdate(
          session._id, 
          updatedData, 
          { new: true }
        );
        
        return res.status(200).json({ session: updatedSession });
      }
    }
    
    // Handle payload requests (new session creation with events)
    if (payload) {
      const { siteId, websiteUrl, userId, pagePath, isWeb3User, sessionId } = payload;
      const sanitizedPagePath = pagePath.replace(/\./g, "_");
      const analytics = await Analytics.findOne({ siteId: siteId });
      
      if (!analytics) {
        // Create new analytics document
        const analytics = new Analytics({
          siteId: siteId,
          websiteUrl: websiteUrl,
          userId: [userId],
          totalVisitors: 1,
          uniqueVisitors: 1,
          web3Visitors: 0,
          walletsConnected: 0,
          pageViews: { [sanitizedPagePath]: 1 },
          sessions: [],
        });
        await analytics.save();
        
        // Create stats documents
        const statstoCreate = {
          siteId: siteId,
          analyticsSnapshot: [
            {
              analyticsId: analytics._id,
              hour: new Date(),
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
        
        analytics.hourlyStats = newHourlyStats._id;
        analytics.dailyStats = newDailyStats._id;
        analytics.weeklyStats = newWeeklyStats._id;
        analytics.monthlyStats = newMonthlyStats._id;
        await analytics.save();
      } else {
        // Update existing analytics document
        if (isWeb3User) {
          const walletIndex = analytics.web3UserId.findIndex(
            (wallet) => wallet === userId
          );
          if (walletIndex === -1) {
            analytics.web3UserId.push(userId);
            analytics.web3Visitors += 1;
          }
        }

        if (!analytics.userId.includes(userId)) {
          analytics.userId.push(userId);
          analytics.uniqueVisitors += 1;
          analytics.totalVisitors += 1;
          analytics.pageViews.set(
            sanitizedPagePath,
            (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
          );
        } else {
          analytics.totalVisitors += 1;
          analytics.pageViews.set(
            sanitizedPagePath,
            (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
          );
        }
        
        analytics.totalPageViews = Array.from(analytics.pageViews.values()).reduce(
          (a, b) => a + b,
          0
        );
        analytics.newVisitors = analytics.userId.length;
        analytics.returningVisitors = analytics.totalVisitors - analytics.newVisitors;
        
        await analytics.save();
      }
      
      // Check if a session with this ID already exists
      if (sessionData && sessionId) {
        const existingSession = await Session.findOne({ sessionId: sessionId });
        
        if (existingSession) {
          // Update existing session
          const updatedSession = await Session.findByIdAndUpdate(
            existingSession._id,
            sessionData,
            { new: true }
          );
          return res.status(200).json({ message: "Data Updated successfully", analytics });
        } else {
          // Create new session
          const newSession = new Session(sessionData);
          await newSession.save();
          analytics.sessions.push(newSession._id);
          await analytics.save();
          return res.status(200).json({ message: "Data Updated successfully", analytics });
        }
      } else {
        return res.status(200).json({ message: "Data Updated successfully", analytics });
      }
    }
    
    return res.status(400).json({ message: "Invalid request data" });
  } catch (e) {
    console.error("Error in postAnalytics:", e);
    res.status(500).json({ message: "Error while processing analytics data", error: e.message });
  }
};

// Controller to handle getting the analytics data
exports.getAnalytics = async (req, res) => {
  try {
    
    const { siteId } = req.params;
    if (!siteId) {
      return res.status(400).json({ message: "Required fields are missing" });
    }
    const analytics = await Analytics.findOne({ siteId: siteId });
    if (!analytics) {
      return res.json({ message: "Analytics not found" });
    }
    // Populate the sessions field with session data
    console.log('t');
    await analytics.populate("sessions");
    await analytics.populate("hourlyStats");
    await analytics.populate("hourlyStats.analyticsSnapshot.analyticsId");
    await analytics.populate("hourlyStats.analyticsSnapshot.analyticsId.sessions");
    await analytics.populate("dailyStats");
    await analytics.populate("dailyStats.analyticsSnapshot.analyticsId");
    await analytics.populate("dailyStats.analyticsSnapshot.analyticsId.sessions");
    await analytics.populate("weeklyStats");
    await analytics.populate("weeklyStats.analyticsSnapshot.analyticsId");
    await analytics.populate("weeklyStats.analyticsSnapshot.analyticsId.sessions");
    await analytics.populate("monthlyStats");
    await analytics.populate("monthlyStats.analyticsSnapshot.analyticsId");
    await analytics.populate("monthlyStats.analyticsSnapshot.analyticsId.sessions");
    console.log(analytics);
    return res
      .status(200)
      .json({ message: "Analytics fetched successfully", analytics });
  } catch (e) {
    console.error("Error while fetching analytics", e);
    res
      .status(500)
      .json({ message: "Error while fetching analytics", error: e.message });
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
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5; // Convert milliseconds to hours
      const alreadyUpdated = differenceInHours < 1; // Check if the last snapshot was taken in the last hour

      if (alreadyUpdated) continue;

      await HourlyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{ analyticsId, hour: roundedHour }],
              $sort: { hour: -1 },
              $slice: 24,
            },
          },
        },
        { upsert: true }
      );
      await HourlyStats.updateOne(
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

exports.updateDailyAnalyticsStats = async (req,res) => {
  try {
    const allAnalytics = await Analytics.find({});

    for (const analytic of allAnalytics) {
      const { siteId, _id: analyticsId } = analytic;
      const hourlyStats = await DailyStats.findOne({ siteId });
      const lastSnapshotAt = hourlyStats && hourlyStats.lastSnapshotAt;
      const lastSnapshotDate = new Date(lastSnapshotAt);

      const now = new Date();
      const roundedHour = new Date(now);
      const differenceInHours = Math.abs(roundedHour - lastSnapshotDate) / 36e5; // Convert milliseconds to hours
      const alreadyUpdated = differenceInHours < 24; // Check if the last snapshot was taken in the last hour

      if (alreadyUpdated) continue;

      await DailyStats.updateOne(
        { siteId },
        {
          $push: {
            analyticsSnapshot: {
              $each: [{ analyticsId, hour: roundedHour }],
              $sort: { hour: -1 },
              $slice: 30,
            },
          },
        },
        { upsert: true }
      );
      await DailyStats.updateOne(
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


