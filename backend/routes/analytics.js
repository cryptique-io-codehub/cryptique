const express = require('express');
const router = express.Router();
const AnalyticsProcessor = require('../utils/analyticsProcessor');

// Get chart data
router.get('/chart', async (req, res) => {
  try {
    const { siteId, timeframe, start, end } = req.query;
    
    if (!siteId) {
      return res.status(400).json({ error: 'Site ID is required' });
    }

    const processor = new AnalyticsProcessor(siteId);
    
    // Parse dates if provided
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    
    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start date' });
    }
    if (endDate && isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid end date' });
    }
    
    const chartData = await processor.getChartData(timeframe, startDate, endDate);
    res.json(chartData);
  } catch (error) {
    console.error('Error getting chart data:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

// Update analytics data
router.post('/update', async (req, res) => {
  try {
    const { siteId, analyticsId } = req.body;
    
    if (!siteId || !analyticsId) {
      return res.status(400).json({ error: 'Site ID and Analytics ID are required' });
    }

    const processor = new AnalyticsProcessor(siteId);
    await processor.updateStats(analyticsId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating analytics:', error);
    res.status(500).json({ error: 'Failed to update analytics' });
  }
});

module.exports = router; 