const { UserJourney, Session } = require('../models/UserJourney');

/**
 * Get user journeys with filtering and pagination
 */
async function getUserJourneys(filters = {}, page = 1, limit = 25) {
  try {
    const { siteId, teamId, timeframe } = filters;
    const query = {};
    
    // Apply filters
    if (siteId) {
      query.siteId = siteId;
    }
    
    if (teamId) {
      query.teamId = teamId;
    }
    
    if (timeframe && timeframe !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch(timeframe) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          cutoffDate.setDate(cutoffDate.getDate() - 1);
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          break;
        default:
          // No time filtering
      }
      
      query.lastVisit = { $gte: cutoffDate, $lte: now };
    }
    
    // Count total documents for pagination
    const totalItems = await UserJourney.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);
    
    // Get paginated results
    const skip = (page - 1) * limit;
    const userJourneys = await UserJourney.find(query)
      .sort({ lastVisit: -1 }) // Sort by most recent visit
      .skip(skip)
      .limit(limit);
    
    return {
      success: true,
      userJourneys,
      totalPages,
      page: parseInt(page),
      totalItems
    };
  } catch (error) {
    console.error('Error getting user journeys:', error);
    throw error;
  }
}

/**
 * Get detailed sessions for a specific user
 */
async function getUserSessions(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const sessions = await Session.find({ userId })
      .sort({ startTime: -1 }); // Sort by most recent first
    
    return {
      success: true,
      sessions
    };
  } catch (error) {
    console.error('Error getting user sessions:', error);
    throw error;
  }
}

/**
 * Track a new session or update an existing one
 */
async function trackSession(sessionData) {
  try {
    const { sessionId, userId, siteId, teamId } = sessionData;
    
    if (!sessionId || !userId || !siteId || !teamId) {
      throw new Error('Session ID, User ID, Site ID, and Team ID are required');
    }
    
    // Check if session already exists
    let session = await Session.findOne({ sessionId });
    
    if (session) {
      // Update existing session
      session = await Session.findOneAndUpdate(
        { sessionId },
        { $set: sessionData },
        { new: true }
      );
    } else {
      // Create new session
      session = new Session(sessionData);
      await session.save();
      
      // Update or create user journey
      await updateUserJourney(userId, siteId, teamId, sessionData);
    }
    
    return {
      success: true,
      session
    };
  } catch (error) {
    console.error('Error tracking session:', error);
    throw error;
  }
}

/**
 * Update or create user journey based on session data
 */
async function updateUserJourney(userId, siteId, teamId, sessionData) {
  try {
    // Find existing user journey or create a new one
    let userJourney = await UserJourney.findOne({ userId });
    
    if (userJourney) {
      // Update existing user journey
      const updates = {
        lastVisit: new Date(),
        $inc: {
          totalSessions: 1,
          totalPageViews: sessionData.pagesViewed || 0,
          totalTimeSpent: sessionData.duration || 0
        }
      };
      
      // Check for conversion if wallet is connected
      if (sessionData.wallet && sessionData.wallet.walletAddress && 
          sessionData.wallet.walletAddress !== 'No Wallet Detected' && 
          !userJourney.hasConverted) {
        
        updates.hasConverted = true;
        updates.userSegment = 'converter';
        
        // Calculate days to conversion
        const daysDiff = Math.floor((new Date() - userJourney.firstVisit) / (1000 * 60 * 60 * 24));
        updates.daysToConversion = daysDiff;
        updates.sessionsBeforeConversion = userJourney.totalSessions + 1;
      }
      
      userJourney = await UserJourney.findOneAndUpdate(
        { userId },
        updates,
        { new: true }
      );
    } else {
      // Create new user journey
      const currentTime = new Date();
      const hasWallet = sessionData.wallet && 
                       sessionData.wallet.walletAddress && 
                       sessionData.wallet.walletAddress !== 'No Wallet Detected';
      
      userJourney = new UserJourney({
        userId,
        siteId,
        teamId,
        firstVisit: currentTime,
        lastVisit: currentTime,
        totalSessions: 1,
        totalPageViews: sessionData.pagesViewed || 0,
        totalTimeSpent: sessionData.duration || 0,
        hasConverted: hasWallet,
        userSegment: hasWallet ? 'converter' : (sessionData.pagesViewed > 1 ? 'engaged' : 'bounced'),
        acquisitionSource: sessionData.utmData?.source || sessionData.referrer || 'direct',
        websiteName: sessionData.websiteName,
        websiteDomain: sessionData.websiteDomain,
        // For converters on first visit
        daysToConversion: hasWallet ? 0 : undefined,
        sessionsBeforeConversion: hasWallet ? 1 : undefined
      });
      
      await userJourney.save();
    }
    
    return userJourney;
  } catch (error) {
    console.error('Error updating user journey:', error);
    throw error;
  }
}

module.exports = {
  getUserJourneys,
  getUserSessions,
  trackSession,
  updateUserJourney
}; 