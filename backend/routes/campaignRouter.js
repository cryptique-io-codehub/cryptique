const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { verifyToken } = require('../middleware/auth');

// Create a new campaign (requires authentication)
router.post('/', verifyToken, campaignController.createCampaign);

// Get all campaigns for a site (requires authentication)
router.get('/site/:siteId', verifyToken, campaignController.getCampaigns);

// Update campaign stats (no auth required - called by SDK)
router.post('/:campaignId/stats', campaignController.updateCampaignStats);

// Get detailed campaign metrics (requires authentication)
router.get('/:campaignId/metrics', verifyToken, campaignController.getCampaignMetrics);

// Delete a campaign (requires authentication)
router.delete('/:campaignId', verifyToken, campaignController.deleteCampaign);

module.exports = router; 