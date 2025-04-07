const Analytics = require("../models/analytics");

exports.updateAnalyticsStats = async (req, res) => {
    try {
      const analytics = await Analytics.find({});
      if (!analytics || analytics.length === 0) {
        return res.json({ message: "Analytics not found" });
      }
  
      for (const analytic of analytics) {
        const now = new Date();
        const snapshot = analytic.toObject();
  
        // Utility to get last timestamp diff
        const getLastDiffHours = (arr) => {
          if (arr.length === 0) return Infinity;
          const last = arr[arr.length - 1].timeStamp;
          return (now - new Date(last)) / 36e5;
        };
  
        // Push snapshot if interval met
        if (getLastDiffHours(analytic.hourlyStats) >= 1) {
          analytic.hourlyStats.push({ stats: snapshot, timeStamp: now });
        }
        if (getLastDiffHours(analytic.dailyStats) >= 24) {
          analytic.dailyStats.push({ stats: snapshot, timeStamp: now });
        }
        if (getLastDiffHours(analytic.weeklyStats) >= 168) {
          analytic.weeklyStats.push({ stats: snapshot, timeStamp: now });
        }
        if (getLastDiffHours(analytic.monthlyStats) >= 720) { // ~30 days
          analytic.monthlyStats.push({ stats: snapshot, timeStamp: now });
        }
  
        await analytic.save();
      }
  
      return res.status(200).json({ message: "Analytics updated successfully" });
    } catch (e) {
      console.error("Error while updating analytics", e);
      res.status(500).json({ message: "Error while updating analytics", error: e.message });
    }
  };
  