const Analytics = require("../models/analytics");

// Controller to handle posting the countryName
exports.postAnalytics = async (req, res) => {
  try {
    const { payload, sessionData } = req.body;
    if (!payload && sessionData) {
      // console.log("sessionData", sessionData);
      const { siteId, userId, pagePath ,walletAddresses,chainId} = sessionData;
      //find the siteId in the database and particular sessionId and update the data accordingly
      const sanitizedPagePath = pagePath.replace(/\./g, "_");
      // console.log("sanitizedPagePath", sanitizedPagePath);
      const analytics = await Analytics.findOne({ siteId: siteId });
      if (!analytics) {
        const analytics = new Analytics({
          siteId: siteId,
          userId: [userId], // Initialize userId as an array with the current userId
          totalVisitors: 1,
          uniqueVisitors: 1,
          pageViews: { [sanitizedPagePath]: 1 },
          walletsConnected: 0,
          sessions: [],
        });
        await analytics.save();
      }
      //if sessionid is same just update the session data
      const sessionIndex = analytics.sessions.findIndex(
        (session) => session.sessionId === sessionData.sessionId
      );
      if (sessionIndex !== -1) {
        analytics.sessions[sessionIndex] = sessionData;
        await analytics.save();
      } else {
        analytics.sessions.push(sessionData);
        await analytics.save();
      }
         const walletIndex = analytics.walletAddresses.findIndex(
      (wallet) => wallet === walletAddresses
    );
    if (walletIndex === -1) {
        
        analytics.walletAddresses.push(walletAddresses); // Add wallet address to the array if not already present
        analytics.walletsConnected += 1; // Increment wallets connected
    } 
  
        
      return res
        .status(200)
        .json({ message: "Session Data Updated successfully", analytics });
    }
    //    console.log(payload);
    //    console.log(sessionData);
    //    return res.status(200).json({ message: "Data Updated successfully", payload,sessionData });
    const { siteId,websiteUrl , userId, pagePath ,walletsConnected} = payload;
    console.log("walletAddress", walletAddresses);
    const sanitizedPagePath = pagePath.replace(/\./g, "_");
    // const {pageUrl, pageTitle, userActivity} = eventData;

    const analytics = await Analytics.findOne({ siteId: siteId });
    if (!analytics) {
      const analytics = new Analytics({
        siteId: siteId,
        websiteUrl: websiteUrl,
        userId: [userId], // Initialize userId as an array with the current userId
        totalVisitors: 1,
        uniqueVisitors: 1,
        pageViews: { [sanitizedPagePath]: 1 },
        walletsConnected: walletsConnected || 0,
        walletAddresses: walletAddresses || [],
        chainId: chainId || [],
        sessions: [],
      });
      await analytics.save();
    }
    //update the wallet stuff if something updates
 
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
      return res.status(404).json({ message: "Analytics not found" });
    }
    return res.status(200).json({ message: "Analytics fetched successfully", analytics });
  } catch (e) {
    console.error("Error while fetching analytics", e);
    res.status(500).json({ message: "Error while fetching analytics", error: e.message });
  }
};