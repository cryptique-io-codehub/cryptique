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
      bounces: 0,
      sessionDurations: new Map()
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
        // Verify this is a campaign-originated session
        const isCampaignSession = session.utmData?.campaign === campaign.campaign && 
                                 (!campaign.utm_id || session.utmData?.utm_id === campaign.utm_id);

        if (!isCampaignSession) {
          console.log('\nSkipping non-campaign session:', {
            sessionId: session._id,
            sessionUtm: session.utmData?.campaign,
            campaignUtm: campaign.campaign,
            sessionUtmId: session.utmData?.utm_id,
            campaignUtmId: campaign.utm_id
          });
          return; // Skip this session
        }

        // Count unique visitors (only from campaign traffic)
        if (session.userId && !campaign.stats.uniqueVisitors.includes(session.userId)) {
          campaign.stats.uniqueVisitors.push(session.userId);
        }

        // Track web3 capability separately from wallet connection
        if (session.isWeb3User && session.userId && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
          campaign.stats.uniqueWeb3Users.push(session.userId);
        }

        // Validate and track unique wallet connections
        if (isWalletConnected(session)) {
          const normalizedAddress = isValidAndNormalizedAddress(session.wallet.walletAddress);
          if (normalizedAddress && !campaign.stats.uniqueWalletAddresses.includes(normalizedAddress)) {
            console.log('\nTracking new unique wallet:', {
              sessionId: session._id,
              originalAddress: session.wallet.walletAddress,
              normalizedAddress: normalizedAddress,
              walletType: session.wallet.walletType,
              chainName: session.wallet.chainName,
              isWeb3User: session.isWeb3User,
              walletConnected: session.walletConnected
            });
            
            campaign.stats.uniqueWalletAddresses.push(normalizedAddress);
          }
        }

        // Track duration metrics (only for campaign sessions)
        if (session.duration && typeof session.duration === 'number' && session.duration > 0) {
          // Store the session duration in a map keyed by session ID to avoid double counting
          if (!campaign.stats.sessionDurations) {
            campaign.stats.sessionDurations = new Map();
          }
          
          if (!campaign.stats.sessionDurations.has(session._id.toString())) {
            campaign.stats.sessionDurations.set(session._id.toString(), session.duration);
            console.log('\nTracking duration for campaign session:', {
              sessionId: session._id,
              duration: session.duration,
              startTime: session.startTime,
              endTime: session.endTime || session.lastActivity,
              utmCampaign: session.utmData?.campaign,
              utmId: session.utmData?.utm_id
            });
          }
        }

        // Track bounce rate (only for campaign sessions)
        if (session.isBounce) {
          campaign.stats.bounces++;
        }
      });

      // Calculate duration metrics
      const sessionDurations = campaign.stats.sessionDurations ? Array.from(campaign.stats.sessionDurations.values()) : [];
      if (sessionDurations.length > 0) {
        campaign.stats.totalDuration = sessionDurations.reduce((sum, duration) => sum + duration, 0);
        campaign.stats.averageDuration = campaign.stats.totalDuration / sessionDurations.length;
        campaign.stats.visitDuration = campaign.stats.averageDuration;
        campaign.stats.bounceRate = (campaign.stats.bounces / sessionDurations.length) * 100;

        console.log('\nCampaign Duration Metrics:', {
          totalDuration: campaign.stats.totalDuration + ' seconds',
          averageDuration: campaign.stats.averageDuration + ' seconds',
          visitDuration: campaign.stats.visitDuration + ' seconds',
          uniqueSessions: sessionDurations.length,
          bounceRate: campaign.stats.bounceRate + '%'
        });
      }

      // Update campaign stats
      campaign.stats.visitors = campaign.stats.uniqueVisitors.length;
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;

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

    // Verify this is a campaign-originated session
    const isCampaignSession = session.utmData?.campaign === campaign.campaign && 
                             (!campaign.utm_id || session.utmData?.utm_id === campaign.utm_id);

    if (!isCampaignSession) {
      console.log('\nSkipping stats update for non-campaign session:', {
        sessionId: session._id,
        sessionUtm: session.utmData?.campaign,
        campaignUtm: campaign.campaign,
        sessionUtmId: session.utmData?.utm_id,
        campaignUtmId: campaign.utm_id
      });
      return res.status(400).json({
        message: "Session does not belong to this campaign"
      });
    }

    // Log session for debugging
    console.log('\nUpdating stats for campaign session:', {
      campaignName: campaign.name,
      sessionId: session._id,
      userId: session.userId,
      utmData: session.utmData,
      duration: session.duration,
      walletAddress: session.wallet?.walletAddress,
      walletType: session.wallet?.walletType,
      chainName: session.wallet?.chainName,
      isWeb3User: session.isWeb3User,
      walletConnected: session.walletConnected
    });

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

    // Track web3 capability
    if (session.isWeb3User && session.userId && !campaign.stats.uniqueWeb3Users.includes(session.userId)) {
      campaign.stats.uniqueWeb3Users.push(session.userId);
      campaign.stats.web3Users = campaign.stats.uniqueWeb3Users.length;
      statsUpdated = true;
    }

    // Validate and track unique wallet connections
    if (isWalletConnected(session)) {
      const normalizedAddress = isValidAndNormalizedAddress(session.wallet.walletAddress);
      if (normalizedAddress && !campaign.stats.uniqueWalletAddresses.includes(normalizedAddress)) {
        console.log('\nTracking new unique wallet:', {
          sessionId: session._id,
          originalAddress: session.wallet.walletAddress,
          normalizedAddress: normalizedAddress,
          walletType: session.wallet.walletType,
          chainName: session.wallet.chainName,
          isWeb3User: session.isWeb3User,
          walletConnected: session.walletConnected
        });
        
        campaign.stats.uniqueWalletAddresses.push(normalizedAddress);
        campaign.stats.uniqueWallets = campaign.stats.uniqueWalletAddresses.length;
        statsUpdated = true;
      }
    }

    // Update duration metrics
    if (session.duration && typeof session.duration === 'number' && session.duration > 0) {
      // Store the session duration in a map keyed by session ID to avoid double counting
      if (!campaign.stats.sessionDurations) {
        campaign.stats.sessionDurations = new Map();
      }
      
      if (!campaign.stats.sessionDurations.has(session._id.toString())) {
        campaign.stats.sessionDurations.set(session._id.toString(), session.duration);
        console.log('\nTracking duration for campaign session:', {
          sessionId: session._id,
          duration: session.duration,
          startTime: session.startTime,
          endTime: session.endTime || session.lastActivity,
          utmCampaign: session.utmData?.campaign,
          utmId: session.utmData?.utm_id
        });
      }
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

// Helper function to validate and normalize Ethereum address
function isValidAndNormalizedAddress(address) {
  if (!address) return false;
  
  // Remove whitespace and convert to lowercase
  address = address.trim().toLowerCase();
  
  // Basic Ethereum address validation
  const isValid = address.startsWith('0x') && 
                 address.length === 42 && 
                 /^0x[0-9a-f]{40}$/.test(address) &&
                 address !== '0x0000000000000000000000000000000000000000';
                 
  return isValid ? address : false;
}

// Helper function to check if wallet is connected
function isWalletConnected(session) {
  if (!session?.wallet) return false;

  // List of values that indicate no wallet
  const noWalletPhrases = [
    'No Wallet Detected',
    'No Wallet Connected',
    'Not Connected',
    'No Chain Detected',
    'Error',
    ''
  ];

  // Check if wallet address is valid and connected
  const hasValidAddress = session.wallet.walletAddress && 
                         !noWalletPhrases.includes(session.wallet.walletAddress.trim()) &&
                         session.wallet.walletAddress.length > 40;

  // Check if wallet type indicates a real wallet
  const hasValidWalletType = session.wallet.walletType && 
                            !noWalletPhrases.includes(session.wallet.walletType.trim());

  // Check if chain name indicates connection
  const hasValidChain = session.wallet.chainName && 
                       !noWalletPhrases.includes(session.wallet.chainName.trim());

  // Additional check for walletConnected flag if it exists
  const isExplicitlyConnected = session.walletConnected === true;

  return (hasValidAddress && (hasValidWalletType || hasValidChain)) || isExplicitlyConnected;
}

// Helper function to process transaction activity
function processTransactionActivity(transactions = []) {
  // Group transactions by date
  const activityByDate = transactions.reduce((acc, tx) => {
    const date = new Date(tx.timestamp).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        date,
        transactions: 0,
        volume: 0,
        uniqueUsers: new Set(),
        conversions: 0,
        conversionValue: 0
      };
    }
    acc[date].transactions++;
    acc[date].volume += tx.value || 0;
    acc[date].uniqueUsers.add(tx.walletAddress);
    
    // Count as conversion if value exceeds threshold
    if (tx.value > 0) {
      acc[date].conversions++;
      acc[date].conversionValue += tx.value;
    }
    return acc;
  }, {});

  // Convert to array and sort by date
  return Object.values(activityByDate).map(day => ({
    ...day,
    uniqueUsers: day.uniqueUsers.size
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Helper function to process contract performance
function processContractPerformance(transactions = [], contracts = []) {
  // Group transactions by contract
  const contractStats = transactions.reduce((acc, tx) => {
    if (!acc[tx.contractAddress]) {
      const contract = contracts.find(c => c.address === tx.contractAddress) || {};
      acc[tx.contractAddress] = {
        address: tx.contractAddress,
        name: contract.name || tx.contractAddress,
        transactions: 0,
        volume: 0,
        uniqueUsers: new Set(),
        conversions: 0,
        conversionValue: 0,
        averageValue: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        uniqueConverters: new Set(),
        conversionRate: 0,
        timeToConversion: [],
        revenueByDay: {},
        topUsers: new Map() // Track top users by volume
      };
    }

    const stats = acc[tx.contractAddress];
    stats.transactions++;
    stats.volume += tx.value || 0;
    stats.uniqueUsers.add(tx.walletAddress);

    // Track transaction success/failure
    if (tx.status === 'success') {
      stats.successfulTransactions++;
    } else {
      stats.failedTransactions++;
    }

    // Track conversions (transactions with value)
    if (tx.value > 0) {
      stats.conversions++;
      stats.conversionValue += tx.value;
      stats.uniqueConverters.add(tx.walletAddress);

      // Track revenue by day
      const date = new Date(tx.timestamp).toISOString().split('T')[0];
      stats.revenueByDay[date] = (stats.revenueByDay[date] || 0) + tx.value;

      // Track time to conversion if we have session data
      if (tx.sessionStartTime) {
        const conversionTime = new Date(tx.timestamp) - new Date(tx.sessionStartTime);
        stats.timeToConversion.push(conversionTime);
      }

      // Update top users
      const userVolume = stats.topUsers.get(tx.walletAddress) || 0;
      stats.topUsers.set(tx.walletAddress, userVolume + tx.value);
    }

    return acc;
  }, {});

  // Process and format the stats
  return Object.values(contractStats).map(stats => ({
    name: stats.name,
    address: stats.address,
    transactions: stats.transactions,
    volume: stats.volume,
    uniqueUsers: stats.uniqueUsers.size,
    conversions: stats.conversions,
    conversionValue: stats.conversionValue,
    averageValue: stats.conversions > 0 ? stats.conversionValue / stats.conversions : 0,
    successRate: (stats.successfulTransactions / stats.transactions) * 100,
    conversionRate: (stats.uniqueConverters.size / stats.uniqueUsers.size) * 100,
    avgTimeToConversion: stats.timeToConversion.length > 0 
      ? stats.timeToConversion.reduce((sum, time) => sum + time, 0) / stats.timeToConversion.length 
      : 0,
    revenueByDay: Object.entries(stats.revenueByDay).map(([date, value]) => ({
      date,
      value
    })).sort((a, b) => new Date(a.date) - new Date(b.date)),
    topUsers: Array.from(stats.topUsers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, volume]) => ({ address, volume }))
  }));
}

// Helper function to calculate user journey metrics
function calculateUserJourney(sessions = [], transactions = []) {
  const transactedUsers = new Set(transactions.map(tx => tx.walletAddress));
  const transactedSessions = sessions.filter(session => 
    session.wallet && transactedUsers.has(session.wallet.walletAddress)
  );

  // Calculate funnel metrics
  const totalVisitors = sessions.length;
  const web3Visitors = sessions.filter(s => s.isWeb3User).length;
  const walletConnections = sessions.filter(s => s.wallet && s.wallet.walletAddress).length;
  const transactors = transactedUsers.size;

  // Calculate average time to first transaction
  const timeToTransaction = transactedSessions.map(session => {
    const sessionStart = new Date(session.startTime);
    const firstTx = transactions.find(tx => 
      tx.walletAddress === session.wallet.walletAddress
    );
    if (!firstTx) return null;
    return new Date(firstTx.timestamp) - sessionStart;
  }).filter(time => time !== null);

  const avgTimeToTransaction = timeToTransaction.length > 0
    ? timeToTransaction.reduce((sum, time) => sum + time, 0) / timeToTransaction.length
    : 0;

  // Calculate conversion rates at each step
  const web3Rate = totalVisitors > 0 ? (web3Visitors / totalVisitors) * 100 : 0;
  const walletRate = web3Visitors > 0 ? (walletConnections / web3Visitors) * 100 : 0;
  const transactionRate = walletConnections > 0 ? (transactors / walletConnections) * 100 : 0;
  const overallConversionRate = totalVisitors > 0 ? (transactors / totalVisitors) * 100 : 0;

  // Calculate bounce rate (sessions with duration < 10 seconds)
  const bounces = sessions.filter(session => 
    !session.duration || session.duration < 10
  ).length;
  const bounceRate = sessions.length > 0
    ? (bounces / sessions.length) * 100
    : 0;

  // Calculate engagement metrics
  const sessionDurations = sessions
    .filter(s => s.duration)
    .map(s => s.duration);
  
  const avgSessionDuration = sessionDurations.length > 0
    ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
    : 0;

  // Calculate repeat visitor rate
  const uniqueVisitors = new Set(sessions.map(s => s.userId)).size;
  const repeatRate = totalVisitors > 0
    ? ((totalVisitors - uniqueVisitors) / totalVisitors) * 100
    : 0;

  return {
    funnel: {
      totalVisitors,
      web3Visitors,
      walletConnections,
      transactors,
      web3Rate: parseFloat(web3Rate.toFixed(2)),
      walletRate: parseFloat(walletRate.toFixed(2)),
      transactionRate: parseFloat(transactionRate.toFixed(2)),
      overallConversionRate: parseFloat(overallConversionRate.toFixed(2))
    },
    engagement: {
      avgSessionDuration,
      bounceRate: parseFloat(bounceRate.toFixed(2)),
      repeatRate: parseFloat(repeatRate.toFixed(2)),
      avgTimeToTransaction
    },
    conversionMetrics: {
      totalConversions: transactions.filter(tx => tx.value > 0).length,
      totalValue: transactions.reduce((sum, tx) => sum + (tx.value || 0), 0),
      avgConversionValue: transactions.length > 0
        ? transactions.reduce((sum, tx) => sum + (tx.value || 0), 0) / transactions.length
        : 0,
      uniqueConverters: transactedUsers.size
    }
  };
}

// Get detailed campaign metrics
exports.getCampaignMetrics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Get campaign data
    const campaign = await Campaign.findById(campaignId).populate('contracts');
    if (!campaign) {
      return res.status(404).json({
        message: "Campaign not found"
      });
    }

    // Get all sessions for this campaign
    const sessions = await Session.find({
      'utmData.campaign': campaign.campaign,
      ...(campaign.utm_id && { 'utmData.utm_id': campaign.utm_id })
    }).sort({ startTime: -1 });

    // Initialize transactions array if it doesn't exist
    const transactions = campaign.stats.transactions || [];

    // Process transaction activity
    const transactionActivity = processTransactionActivity(transactions);

    // Process contract performance
    const contractPerformance = processContractPerformance(transactions, campaign.contracts);

    // Calculate user journey metrics
    const userJourney = calculateUserJourney(sessions, transactions);

    // Calculate overall campaign performance
    const campaignPerformance = {
      totalValue: transactions.reduce((sum, tx) => sum + (tx.value || 0), 0),
      roi: campaign.budget?.amount > 0
        ? ((transactions.reduce((sum, tx) => sum + (tx.value || 0), 0) - campaign.budget.amount) / campaign.budget.amount) * 100
        : 0,
      cac: transactedUsers.size > 0 && campaign.budget?.amount
        ? campaign.budget.amount / transactedUsers.size
        : 0
    };

    return res.status(200).json({
      message: "Campaign metrics fetched successfully",
      transactionActivity,
      contractPerformance,
      userJourney,
      campaignPerformance
    });
  } catch (error) {
    console.error("Error getting campaign metrics:", error);
    return res.status(500).json({
      message: "Error getting campaign metrics",
      error: error.message
    });
  }
}; 