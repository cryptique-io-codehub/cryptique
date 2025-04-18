const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../middleware/auth');

// Create a new campaign (requires authentication)
router.post('/', auth, campaignController.createCampaign);

// Get all campaigns for a site (requires authentication)
router.get('/site/:siteId', auth, campaignController.getCampaigns);

// Update campaign stats (requires authentication)
router.put('/:campaignId/stats', auth, campaignController.updateCampaignStats);

// Delete a campaign (requires authentication)
router.delete('/:campaignId', auth, campaignController.deleteCampaign);

module.exports = router; 