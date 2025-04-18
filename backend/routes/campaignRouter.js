const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticate } = require('../middleware/auth');

// Create a new campaign (requires authentication)
router.post('/', authenticate, campaignController.createCampaign);

// Get all campaigns for a site (requires authentication)
router.get('/site/:siteId', authenticate, campaignController.getCampaigns);

// Update campaign stats (no auth required - called by SDK)
router.post('/:campaignId/stats', campaignController.updateCampaignStats);

// Delete a campaign (requires authentication)
router.delete('/:campaignId', authenticate, campaignController.deleteCampaign);

module.exports = router; 