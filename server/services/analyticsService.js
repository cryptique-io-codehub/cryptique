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

// Generate analytics data with real-time updates
const generateAnalyticsData = (rawData) => {
  // Process new data points
  rawData.forEach(entry => {
    const timestamp = new Date(entry.timestamp);
    const roundedTime = roundToNearest15Minutes(new Date(timestamp));
    const timeKey = roundedTime.toISOString();
    
    // Initialize or update interval data
    if (!realTimeData.has(timeKey)) {
      realTimeData.set(timeKey, {
        timestamp: timeKey,
        visitors: 0,
        pageViews: 0,
        rawPoints: [] // Store individual data points
      });
    }
    
    const interval = realTimeData.get(timeKey);
    interval.rawPoints.push({
      timestamp: timestamp.toISOString(),
      visitors: entry.visitors || 1,
      pageViews: entry.pageViews || getRandomInt(1, 3)
    });
    
    // Update aggregated values
    interval.visitors = interval.rawPoints.reduce((sum, point) => sum + point.visitors, 0);
    interval.pageViews = interval.rawPoints.reduce((sum, point) => sum + point.pageViews, 0);
  });
  
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