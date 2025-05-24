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
      roi: 0,
      totalDuration: 0,
      bounces: 0
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

    console.log('\n=== Campaign Session Monitoring Start ===');
    console.log(`Site ID: ${siteId}`);
    console.log(`Total Campaigns Found: ${campaigns.length}`);
    console.log('=====================================\n');

    // For each campaign, get and process its sessions
    for (let campaign of campaigns) {
      // Build query based on whether utm_id exists
      let sessionQuery = {
        siteId,
        'utmData.campaign': campaign.campaign
      };

      // If utm_id exists, add it to the query
      if (campaign.utm_id) {
        sessionQuery['utmData.utm_id'] = campaign.utm_id;
      }

      // Find all sessions with matching UTM parameters
      const sessions = await Session.find(sessionQuery).sort({ startTime: -1 });

      console.log(`\n=== Campaign: ${campaign.name} ===`);
      console.log(`Campaign ID: ${campaign._id}`);
      console.log(`UTM Campaign Value: ${campaign.campaign}`);
      if (campaign.utm_id) {
        console.log(`UTM_ID: ${campaign.utm_id}`);
      } else {
        console.log('UTM_ID: Not set (legacy campaign)');
      }
      console.log(`Total Active Sessions: ${sessions.length}`);
      
      if (sessions.length > 0) {
        console.log('\nDetailed Session Information:');
        sessions.forEach((session, index) => {
          console.log(`\nSession ${index + 1}:`);
          console.log('- Session ID:', session._id);
          console.log('- User ID:', session.userId);
          console.log('- Start Time:', new Date(session.startTime).toLocaleString());
          console.log('- End Time:', session.endTime ? new Date(session.endTime).toLocaleString() : 'Active');
          console.log('- Duration:', session.duration ? `${session.duration} seconds` : 'Ongoing');
          console.log('- UTM Data:', JSON.stringify(session.utmData, null, 2));
          console.log('- Wallet Connected:', session.wallet ? 'Yes' : 'No');
          if (session.wallet) {
            console.log('  - Wallet Address:', session.wallet.walletAddress);
          }
        });
      } else {
        console.log('\nNo active sessions found for this campaign');
      }
      
      // Reset stats arrays
      campaign.stats.uniqueVisitors = [];
      campaign.stats.uniqueWeb3Users = [];
      campaign.stats.uniqueWalletAddresses = [];

      // Process each session
      sessions.forEach(session => {
        // Count unique visitors
        if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
          campaign.stats.uniqueVisitors.push(session.userId);
        }

        // Count unique web3 users (users who have web3 capability detected)
        if (session.isWeb3User && session.userId && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
          campaign.stats.uniqueWeb3Users.push(session.userId);
        }

        // Count unique wallets (only when wallet is actually connected)
        if (session.wallet?.walletAddress && 
            session.wallet.walletAddress.trim() !== '' && 
            session.wallet.walletAddress !== 'No Wallet Detected' &&
            session.wallet.walletAddress !== 'Not Connected' &&
            session.wallet.walletAddress.length > 10 &&
            !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
          campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
        }

        // Track duration metrics
        if (session.duration && typeof session.duration === 'number' && session.duration > 0) {
          campaign.stats.totalDuration += session.duration;
        }

        // Track bounce rate
        if (session.isBounce) {
          campaign.stats.bounces++;
        }
      });

      // Update campaign stats
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;

      // Calculate duration metrics
      if (sessions.length > 0) {
        campaign.stats.averageDuration = campaign.stats.totalDuration / sessions.length; // Average duration in seconds
        campaign.stats.visitDuration = campaign.stats.averageDuration / 60; // Convert to minutes for backward compatibility
        campaign.stats.bounceRate = (campaign.stats.bounces / sessions.length) * 100; // Calculate bounce rate as percentage
      }

      // Save updated campaign stats
      await campaign.save();
    }

    console.log('\n=== Campaign Session Monitoring Complete ===\n');

    return res.status(200).json({
      message: "Campaigns fetched successfully",
      campaigns
    });
  } catch (error) {
    console.error("Error in getCampaigns:", error);
    return res.status(500).json({
      message: "Error fetching campaigns",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
    if (typeof campaign.stats.totalDuration !== 'number') campaign.stats.totalDuration = 0;
    if (typeof campaign.stats.bounces !== 'number') campaign.stats.bounces = 0;

    let statsUpdated = false;

    // Update unique visitors
    if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
      campaign.stats.uniqueVisitors.push(session.userId);
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      statsUpdated = true;
    }

    // Update unique web3 users
    if (session.isWeb3User && session.userId && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
      campaign.stats.uniqueWeb3Users.push(session.userId);
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      statsUpdated = true;
    }

    // Update unique wallets with proper validation
    if (session.wallet?.walletAddress && 
        session.wallet.walletAddress.trim() !== '' && 
        session.wallet.walletAddress !== 'No Wallet Detected' &&
        session.wallet.walletAddress !== 'Not Connected' &&
        session.wallet.walletAddress.length > 10 &&
        !campaign.stats.uniqueWalletAddresses.includes(session.wallet.walletAddress)) {
      campaign.stats.uniqueWalletAddresses.push(session.wallet.walletAddress);
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
      statsUpdated = true;
    }

    // Update duration metrics
    if (session.duration && typeof session.duration === 'number' && session.duration > 0) {
      campaign.stats.totalDuration += session.duration;
      statsUpdated = true;
    }

    // Track bounce rate
    if (session.isBounce) {
      campaign.stats.bounces++;
      statsUpdated = true;
    }

    // Calculate duration metrics
    const totalSessions = campaign.stats.visitors; // Use unique visitors count
    if (totalSessions > 0) {
      campaign.stats.averageDuration = campaign.stats.totalDuration / totalSessions; // Average duration in seconds
      campaign.stats.visitDuration = campaign.stats.averageDuration / 60; // Convert to minutes for backward compatibility
      campaign.stats.bounceRate = (campaign.stats.bounces / totalSessions) * 100; // Calculate bounce rate as percentage
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