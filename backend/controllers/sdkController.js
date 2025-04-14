const Analytics = require("../models/analytics");
const Session = require("../models/session");
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require("../models/stats");

// Controller to handle posting the countryName
exports.postAnalytics = async (req, res) => {
  try {
    const { payload, sessionData } = req.body;
    if (!payload && sessionData) {
      // console.log("sessionData", sessionData);
      const { siteId, wallet,sessionId } = sessionData;
      const analytics = await Analytics.findOne({ siteId: siteId });
      const session=await Session.findOne({sessionId:sessionId});
      if (wallet && wallet.walletAddress.length > 0) {
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
        }

        await analytics.save(); // Increment wallets connected
      }

      //if sessionid is same just update the session data
      if(!session) {
        const newSession = new Session(sessionData);
        await newSession.save();
        analytics.sessions.push(newSession._id); // Add session to the analytics
        await analytics.save();
      }
      else{
        const updatedSession = await Session.findByIdAndUpdate(session._id, sessionData, { new: true });

        if (updatedSession.duration > 30) {
          updatedSession.isBounce = false;
          await updatedSession.save();
        }
        console.log("updatedSession", updatedSession);  
      }
      return res
        .status(200)
        .json({ session });
    }
    const { siteId, websiteUrl, userId, pagePath, isWeb3User } = payload;
    const sanitizedPagePath = pagePath.replace(/\./g, "_");
    const analytics = await Analytics.findOne({ siteId: siteId });
    if (!analytics) {
      const analytics = new Analytics({
        siteId: siteId,
        websiteUrl: websiteUrl,
        userId: [userId], // Initialize userId as an array with the current userId
        totalVisitors: 1,
        uniqueVisitors: 1,
        web3Visitors:  0,
        walletsConnected: 0,
        pageViews: { [sanitizedPagePath]: 1 },
        sessions: [],
      });
      await analytics.save();
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
      analytics.hourlyStats = newHourlyStats._id; // Add the new stats reference to the analytics
      analytics.dailyStats = newDailyStats._id; // Add the new stats reference to the analytics
      analytics.weeklyStats = newWeeklyStats._id; // Add the new stats reference to the analytics
      analytics.monthlyStats = newMonthlyStats._id; // Add the new stats reference to the analytics
      await analytics.save(); // Save the updated analytics document
    
    }
    //update the wallet stuff if something updates
    if (isWeb3User) {
      const walletIndex = analytics.web3UserId.findIndex(
        (wallet) => wallet === userId
      );
      if (walletIndex === -1) {
        analytics.web3UserId.push(userId); // Add wallet address to the array if not already present
        analytics.web3Visitors += 1; // Increment wallets connected
      }
    }

    if (!analytics.userId.includes(userId)) {
      analytics.userId.push(userId); // Add userId to the array if not already present
      analytics.uniqueVisitors += 1; // Increment unique visitors
      analytics.totalVisitors += 1; // Increment total visitors
      analytics.pageViews.set(
        sanitizedPagePath,
        (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
      );
    } else {
      analytics.totalVisitors += 1; // Increment total visitors
      analytics.pageViews.set(
        sanitizedPagePath,
        (analytics.pageViews.get(sanitizedPagePath) || 0) + 1
      );
    }
    //sum all pageviews to get total pageviews
    analytics.totalPageViews = Array.from(analytics.pageViews.values()).reduce(
      (a, b) => a + b,
      0
    );
    //calculate new visitors and returning visitors
    analytics.newVisitors = analytics.userId.length;
    analytics.returningVisitors =
      analytics.totalVisitors - analytics.newVisitors;

    // Handle session data
    if (sessionData) {
      const existingSession = await Session.findOne({ sessionId: sessionData.sessionId });
      
      if (existingSession) {
        // Update existing session
        await existingSession.addPageView(sessionData.currentPage);
        await existingSession.updateActivity();
        
        // Update session end time if provided
        if (sessionData.sessionEnd) {
          existingSession.endTime = new Date(sessionData.sessionEnd);
          await existingSession.save();
        }
      } else {
        // Create new session only if it doesn't exist
        const newSession = new Session({
          ...sessionData,
          pagesViewed: 1,
          duration: 0,
          isBounce: true,
          lastActivity: new Date()
        });
        await newSession.save();
        analytics.sessions.push(newSession._id);
      }
    }

    await analytics.save();
    return res
      .status(200)
      .json({ message: "Data Updated successfully", analytics });
  } catch (e) {
    res
      .status(500)
      .json({ message: "Error while posting analyics name", error: e.message });
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


