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
      web3Users: 0,
      uniqueWeb3Users: [],
      uniqueWallets: 0,
      uniqueWalletAddresses: [],
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

      // Log sessions for debugging
      console.log(`\nSessions for campaign "${campaign.name}" (${campaign.campaign}):`);
      console.log('Total sessions found:', sessions.length);
      sessions.forEach((session, index) => {
        console.log(`\nSession ${index + 1}:`);
        console.log('- User ID:', session.userId);
        console.log('- UTM Data:', session.utmData);
        console.log('- Duration (seconds):', session.duration);
        console.log('- Wallet:', session.wallet?.walletAddress);
        console.log('- Start Time:', session.startTime);
        console.log('- End Time:', session.endTime);
      });

      // Reset stats arrays
      campaign.stats.uniqueVisitors = [];
      campaign.stats.uniqueWeb3Users = [];
      campaign.stats.uniqueWalletAddresses = [];

      let totalDuration = 0;

      // Process each session
      sessions.forEach(session => {
        // Count unique visitors
        if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
          campaign.stats.uniqueVisitors.push(session.userId);
        }

        // Count unique web3 users (users who have connected a wallet)
        if (session.wallet?.walletAddress && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
          campaign.stats.uniqueWeb3Users.push(session.userId);
        }

        // Count unique wallets
        if (session.wallet?.walletAddress && 
            !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
          campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
        }

        // Add to total duration (convert from seconds to minutes)
        if (session.duration) {
          totalDuration += session.duration;
        }
      });

      // Update campaign stats
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
      // Convert total duration from seconds to minutes
      campaign.stats.visitDuration = sessions.length > 0 ? (totalDuration / sessions.length) / 60 : 0;

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

    // Log session for debugging
    console.log(`\nUpdating stats for campaign "${campaign.name}" with new session:`);
    console.log('- Session ID:', session._id);
    console.log('- User ID:', session.userId);
    console.log('- UTM Data:', session.utmData);
    console.log('- Duration (seconds):', session.duration);
    console.log('- Wallet:', session.wallet?.walletAddress);

    // Verify this session belongs to this campaign
    if (session.utmData?.campaign !== campaign.campaign) {
      return res.status(400).json({
        message: "Session does not belong to this campaign"
      });
    }

    // Initialize arrays if they don't exist
    if (!campaign.stats.uniqueVisitors) campaign.stats.uniqueVisitors = [];
    if (!campaign.stats.uniqueWeb3Users) campaign.stats.uniqueWeb3Users = [];
    if (!campaign.stats.uniqueWalletAddresses) campaign.stats.uniqueWalletAddresses = [];

    let statsUpdated = false;

    // Update unique visitors
    if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
      campaign.stats.uniqueVisitors.push(session.userId);
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      statsUpdated = true;
    }

    // Update unique web3 users
    if (session.wallet?.walletAddress && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
      campaign.stats.uniqueWeb3Users.push(session.userId);
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      statsUpdated = true;
    }

    // Update unique wallets
    if (session.wallet?.walletAddress && 
        !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
      campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
      statsUpdated = true;
    }

    // Update visit duration (convert from seconds to minutes)
    if (session.duration) {
      const totalDurationInSeconds = (campaign.stats.visitDuration * 60 * (campaign.stats.visitors - 1)) + session.duration;
      campaign.stats.visitDuration = (totalDurationInSeconds / campaign.stats.visitors) / 60;
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