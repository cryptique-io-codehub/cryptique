// Helper function to generate random number within range
const getRandomInt = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to round time to nearest 15 minutes
const roundToNearest15Minutes = (date) => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.floor(minutes / 15) * 15;
  date.setMinutes(roundedMinutes, 0, 0);
  return date;
};

// Store real-time data
let realTimeData = new Map();

// Process SDK analytics data
const processSDKData = (sdkData) => {
  const timestamp = new Date();
  const roundedTime = roundToNearest15Minutes(new Date(timestamp));
  const timeKey = roundedTime.toISOString();
  
  // Initialize or update interval data
  if (!realTimeData.has(timeKey)) {
    realTimeData.set(timeKey, {
      timestamp: timeKey,
      visitors: 0,
      pageViews: 0,
      wallets: 0,
      rawPoints: []
    });
  }
  
  const interval = realTimeData.get(timeKey);
  
  // Add new data point
  const newPoint = {
    timestamp: timestamp.toISOString(),
    visitors: sdkData.newVisitors || 0,
    pageViews: sdkData.totalPageViews || 0,
    wallets: sdkData.walletsConnected || 0
  };
  
  interval.rawPoints.push(newPoint);
  
  // Update aggregated values
  interval.visitors = interval.rawPoints.reduce((sum, point) => sum + point.visitors, 0);
  interval.pageViews = interval.rawPoints.reduce((sum, point) => sum + point.pageViews, 0);
  interval.wallets = interval.rawPoints.reduce((sum, point) => sum + point.wallets, 0);
  
  return interval;
};

// Generate analytics data with real-time updates
const generateAnalyticsData = (rawData) => {
  // Process the SDK data
  const newInterval = processSDKData(rawData);
  
  // Get current time and calculate cutoff (last 24 hours)
  const now = new Date();
  const cutoffTime = new Date(now);
  cutoffTime.setHours(cutoffTime.getHours() - 24);
  
  // Filter and sort data
  const filteredData = Array.from(realTimeData.values())
    .filter(entry => new Date(entry.timestamp) >= cutoffTime)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  
  return filteredData;
};

// Clear old data periodically
setInterval(() => {
  const now = new Date();
  const cutoffTime = new Date(now);
  cutoffTime.setHours(cutoffTime.getHours() - 24);
  
  for (const [key, value] of realTimeData.entries()) {
    if (new Date(key) < cutoffTime) {
      realTimeData.delete(key);
    }
  }
}, 3600000); // Run every hour

module.exports = {
  generateAnalyticsData
}; 