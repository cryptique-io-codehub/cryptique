const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');

// Campaign routes
router.post('/', campaignController.createCampaign);
router.get('/site/:siteId', campaignController.getCampaigns);
router.get('/:campaignId/metrics', campaignController.getCampaignMetrics);
router.delete('/:campaignId', campaignController.deleteCampaign);
router.post('/:campaignId/stats', campaignController.updateCampaignStats);

module.exports = router; 