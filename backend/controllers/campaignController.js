const Campaign = require("../models/campaign");
const Analytics = require("../models/analytics");
const { nanoid } = require('nanoid');

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    const {
      siteId,
      name,
      domain,
      path,
      source,
      medium,
      campaign,
      term,
      content,
      budgetCurrency,
      budgetAmount,
      shortenedDomain
    } = req.body;

    // Generate short URL code
    const shortCode = nanoid(8); // 8 character unique code
    const shortUrl = `https://${shortenedDomain}/${shortCode}`;

    // Generate long URL with UTM parameters
    const params = new URLSearchParams();
    if (source) params.append('utm_source', source);
    if (medium) params.append('utm_medium', medium);
    if (campaign) params.append('utm_campaign', campaign);
    if (term) params.append('utm_term', term);
    if (content) params.append('utm_content', content);
    const longUrl = `https://${domain}${path}${params.toString() ? '?' + params.toString() : ''}`;

    // Create new campaign
    const newCampaign = new Campaign({
      siteId,
      name,
      domain,
      path,
      source,
      medium,
      campaign,
      term,
      content,
      budget: {
        currency: budgetCurrency,
        amount: budgetAmount
      },
      shortenedDomain,
      longUrl,
      shortUrl
    });

    await newCampaign.save();

    res.status(201).json({
      message: "Campaign created successfully",
      campaign: newCampaign
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    res.status(500).json({
      message: "Error creating campaign",
      error: error.message
    });
  }
};

// Get campaigns for a site
exports.getCampaigns = async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const campaigns = await Campaign.find({ siteId })
      .populate('sessions')
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Campaigns fetched successfully",
      campaigns
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    res.status(500).json({
      message: "Error fetching campaigns",
      error: error.message
    });
  }
};

// Update campaign stats based on analytics
exports.updateCampaignStats = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const campaign = await Campaign.findById(campaignId).populate('sessions');
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Get analytics for the campaign's site
    const analytics = await Analytics.findOne({ siteId: campaign.siteId })
      .populate('sessions');

    if (!analytics) {
      return res.status(404).json({ message: "Analytics not found" });
    }

    // Filter sessions with matching UTM parameters
    const campaignSessions = analytics.sessions.filter(session => {
      if (!session.utmData) return false;
      
      return (
        session.utmData.source === campaign.source &&
        session.utmData.medium === campaign.medium &&
        (!campaign.campaign || session.utmData.campaign === campaign.campaign) &&
        (!campaign.term || session.utmData.term === campaign.term) &&
        (!campaign.content || session.utmData.content === campaign.content)
      );
    });

    // Update campaign stats
    campaign.sessions = campaignSessions.map(session => session._id);
    campaign.stats = {
      visitors: campaignSessions.length,
      webUsers: new Set(campaignSessions.map(s => s.userId)).size,
      uniqueWallets: new Set(campaignSessions.filter(s => s.wallet).map(s => s.wallet.walletAddress)).size,
      transactedUsers: campaignSessions.filter(s => s.hasTransaction).length,
      visitDuration: campaignSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / campaignSessions.length || 0,
      conversions: campaignSessions.filter(s => s.hasConversion).length,
      conversionsValue: campaignSessions.reduce((acc, s) => acc + (s.conversionValue || 0), 0),
    };

    // Calculate CAC and ROI if budget exists
    if (campaign.budget.amount > 0) {
      campaign.stats.cac = campaign.budget.amount / (campaign.stats.transactedUsers || 1);
      campaign.stats.roi = ((campaign.stats.conversionsValue - campaign.budget.amount) / campaign.budget.amount) * 100;
    }

    await campaign.save();

    res.status(200).json({
      message: "Campaign stats updated successfully",
      campaign
    });
  } catch (error) {
    console.error("Error updating campaign stats:", error);
    res.status(500).json({
      message: "Error updating campaign stats",
      error: error.message
    });
  }
};

// Delete a campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await Campaign.findByIdAndDelete(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.status(200).json({
      message: "Campaign deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    res.status(500).json({
      message: "Error deleting campaign",
      error: error.message
    });
  }
}; 