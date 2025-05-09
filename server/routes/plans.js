const express = require('express');
const router = express.Router();
const subscriptionPlans = require('../config/subscriptionPlans');

/**
 * Get all available subscription plans
 * GET /api/plans
 */
router.get('/', (req, res) => {
  try {
    return res.status(200).json({
      plans: subscriptionPlans
    });
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    return res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

module.exports = router; 