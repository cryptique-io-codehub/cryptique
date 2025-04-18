const Campaign = require("../models/campaign");
const Session = require("../models/session");

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const campaignData = req.body;
    
    // Initialize stats object
    campaignData.stats = {
      visitors: 0,
      uniqueVisitors: [], // Array to store unique user IDs
      webUsers: 0,
      uniqueWebUsers: [], // Array to store unique web user IDs
      uniqueWallets: 0,
      uniqueWalletAddresses: [], // Array to store unique wallet addresses
      transactedUsers: 0,
      visitDuration: 0,
      conversions: 0,
      conversionsValue: 0,
      cac: 0,
      roi: 0
    };

    // Create new campaign
    const campaign = new Campaign(campaignData);
    await campaign.save();

    return res.status(200).json({
      message: "Campaign created successfully",
      campaign
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
    
    // Get all campaigns for the site
    const campaigns = await Campaign.find({ siteId }).sort({ createdAt: -1 });

    // For each campaign, get and process its sessions
    for (let campaign of campaigns) {
      // Find all sessions with matching UTM campaign
      const sessions = await Session.find({
        siteId,
        'utmData.campaign': campaign.campaign
      });

      // Reset stats arrays
      campaign.stats.uniqueVisitors = [];
      campaign.stats.uniqueWebUsers = [];
      campaign.stats.uniqueWalletAddresses = [];

      let totalDuration = 0;

      // Process each session
      sessions.forEach(session => {
        // Count unique visitors
        if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
          campaign.stats.uniqueVisitors.push(session.userId);
        }

        // Count unique web users (users who have logged in)
        if (session.userId && !campaign.stats.uniqueWebUsers.includes(session.userId)) {
          campaign.stats.uniqueWebUsers.push(session.userId);
        }

        // Count unique wallets
        if (session.wallet?.walletAddress && 
            !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
          campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
        }

        // Add to total duration
        if (session.duration) {
          totalDuration += session.duration;
        }
      });

      // Update campaign stats
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      campaign.stats.webUsers = campaign.stats.uniqueWebUsers.length;
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
      campaign.stats.visitDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;

      // Save updated campaign stats
      await campaign.save();
    }

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

// Update campaign stats when a new session is created or updated
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

    // Get session data
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        message: "Session not found"
      });
    }

    // Verify this session belongs to this campaign
    if (session.utmData?.campaign !== campaign.campaign) {
      return res.status(400).json({
        message: "Session does not belong to this campaign"
      });
    }

    // Initialize arrays if they don't exist
    if (!campaign.stats.uniqueVisitors) campaign.stats.uniqueVisitors = [];
    if (!campaign.stats.uniqueWebUsers) campaign.stats.uniqueWebUsers = [];
    if (!campaign.stats.uniqueWalletAddresses) campaign.stats.uniqueWalletAddresses = [];

    let statsUpdated = false;

    // Update unique visitors
    if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
      campaign.stats.uniqueVisitors.push(session.userId);
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      statsUpdated = true;
    }

    // Update unique web users
    if (session.userId && !campaign.stats.uniqueWebUsers.includes(session.userId)) {
      campaign.stats.uniqueWebUsers.push(session.userId);
      campaign.stats.webUsers = campaign.stats.uniqueWebUsers.length;
      statsUpdated = true;
    }

    // Update unique wallets
    if (session.wallet?.walletAddress && 
        !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
      campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
      statsUpdated = true;
    }

    // Update visit duration
    if (session.duration) {
      const totalDuration = (campaign.stats.visitDuration * (campaign.stats.visitors - 1)) + session.duration;
      campaign.stats.visitDuration = totalDuration / campaign.stats.visitors;
      statsUpdated = true;
    }

    // Save changes if any updates were made
    if (statsUpdated) {
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