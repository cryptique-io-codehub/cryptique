const express = require('express');
const router = express.Router();

// SDK track endpoint
router.post('/track', async (req, res) => {
  try {
    const { event, data } = req.body;
    
    // Log the incoming data
    console.log('SDK Track Event:', { event, data, origin: req.headers.origin });
    
    // Process the tracking data
    // TODO: Implement proper tracking data processing
    
    // Send response with appropriate headers
    res.status(200).json({ 
      success: true, 
      message: 'Event tracked successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to track event',
      message: error.message 
    });
  }
});

// Handle preflight requests explicitly
router.options('/track', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.status(204).end();
});

module.exports = router; 