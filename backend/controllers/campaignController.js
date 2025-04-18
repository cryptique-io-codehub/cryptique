const Campaign = require("../models/campaign");
const Session = require("../models/session");

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const campaignData = req.body;

    // Validate required fields
    const requiredFields = ['siteId', 'name', 'domain', 'path', 'source', 'medium', 'shortenedDomain', 'longUrl', 'shortUrl'];
    const missingFields = requiredFields.filter(field => !campaignData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        fields: missingFields
      });
    }

    // Initialize stats object if not provided
    if (!campaignData.stats) {
      campaignData.stats = {
        visitors: 0,
        webUsers: 0,
        uniqueWallets: 0,
        transactedUsers: 0,
        visitDuration: 0,
        conversions: 0,
        conversionsValue: 0,
        cac: 0,
        roi: 0
      };
    }

    // Initialize sessions array if not provided
    if (!campaignData.sessions) {
      campaignData.sessions = [];
    }

    // Create new campaign
    const campaign = new Campaign(campaignData);
    
    // Save campaign and wait for the operation to complete
    const savedCampaign = await campaign.save();

    // Verify the campaign was saved by fetching it from the database
    const verifiedCampaign = await Campaign.findById(savedCampaign._id);
    
    if (!verifiedCampaign) {
      throw new Error("Campaign failed to persist in database");
    }

    return res.status(200).json({
      message: "Campaign created successfully",
      campaign: verifiedCampaign
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return res.status(500).json({
      message: "Error creating campaign",
      error: error.message
    });
  }
};

// Get all campaigns for a site
exports.getCampaigns = async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const campaigns = await Campaign.find({ siteId })
      .populate('sessions')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Campaigns fetched successfully",
      campaigns
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res.status(500).json({
      message: "Error fetching campaigns",
      error: error.message
    });
  }
};

// Update campaign stats
exports.updateCampaignStats = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { sessionId } = req.body;

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    // Add session to campaign if not already present
    if (sessionId && !campaign.sessions.includes(sessionId)) {
      campaign.sessions.push(sessionId);
      
      // Update campaign stats
      const session = await Session.findById(sessionId);
      if (session) {
        campaign.stats.visitors += 1;
        if (session.userId) campaign.stats.webUsers += 1;
        if (session.wallet) campaign.stats.uniqueWallets += 1;
        if (session.transactions && session.transactions.length > 0) {
          campaign.stats.transactedUsers += 1;
        }
        campaign.stats.visitDuration = (campaign.stats.visitDuration * (campaign.stats.visitors - 1) + session.duration) / campaign.stats.visitors;
      }

      await campaign.save();
    }

    return res.status(200).json({
      message: "Campaign stats updated successfully",
      campaign
    });
  } catch (error) {
    console.error("Error updating campaign stats:", error);
    return res.status(500).json({
      message: "Error updating campaign stats",
      error: error.message
    });
  }
};

// Delete a campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    await Campaign.findByIdAndDelete(campaignId);

    return res.status(200).json({
      message: "Campaign deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return res.status(500).json({
      message: "Error deleting campaign",
      error: error.message
    });
  }
}; 