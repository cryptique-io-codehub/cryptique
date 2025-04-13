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

// Generate analytics data with 15-minute intervals
const generateAnalyticsData = (rawData) => {
  const intervalMap = new Map();
  
  // Process each raw data point
  rawData.forEach(entry => {
    const timestamp = new Date(entry.timestamp);
    const roundedTime = roundToNearest15Minutes(new Date(timestamp));
    const timeKey = roundedTime.toISOString();
    
    // Initialize or update interval data
    if (!intervalMap.has(timeKey)) {
      intervalMap.set(timeKey, {
        timestamp: timeKey,
        visitors: 0,
        pageViews: 0
      });
    }
    
    const interval = intervalMap.get(timeKey);
    interval.visitors += entry.visitors || 1;
    interval.pageViews += entry.pageViews || getRandomInt(1, 3);
  });
  
  // Convert map to sorted array
  return Array.from(intervalMap.values())
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

module.exports = {
  generateAnalyticsData
}; 