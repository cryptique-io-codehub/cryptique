const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../models/stats');
const Analytics = require('../models/analytics');

class AnalyticsProcessor {
  constructor(siteId) {
    this.siteId = siteId;
  }

  async updateStats(analyticsId) {
    try {
      const analytics = await Analytics.findById(analyticsId);
      if (!analytics) throw new Error('Analytics document not found');

      const now = new Date();
      const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const week = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      const month = new Date(now.getFullYear(), now.getMonth(), 1);

      // Update hourly stats
      await this.updateTimeBasedStats(HourlyStats, hour, analytics);
      
      // Update daily stats
      await this.updateTimeBasedStats(DailyStats, day, analytics);
      
      // Update weekly stats
      await this.updateTimeBasedStats(WeeklyStats, week, analytics);
      
      // Update monthly stats
      await this.updateTimeBasedStats(MonthlyStats, month, analytics);

      return true;
    } catch (error) {
      console.error('Error updating stats:', error);
      throw error;
    }
  }

  async updateTimeBasedStats(StatsModel, time, analytics) {
    try {
      const stats = await StatsModel.findOne({ siteId: this.siteId });
      const snapshot = {
        analyticsId: analytics._id,
        timestamp: time,
        visitors: analytics.totalVisitors,
        wallets: analytics.walletsConnected,
        pageViews: analytics.totalPageViews
      };

      if (!stats) {
        // Create new stats document
        const newStats = new StatsModel({
          siteId: this.siteId,
          analyticsSnapshot: [snapshot],
          lastSnapshotAt: new Date()
        });
        await newStats.save();
      } else {
        // Update existing stats
        const existingSnapshot = stats.analyticsSnapshot.find(
          s => s.timestamp.getTime() === time.getTime()
        );

        if (existingSnapshot) {
          // Update existing snapshot
          existingSnapshot.visitors = snapshot.visitors;
          existingSnapshot.wallets = snapshot.wallets;
          existingSnapshot.pageViews = snapshot.pageViews;
        } else {
          // Add new snapshot
          stats.analyticsSnapshot.push(snapshot);
        }

        stats.lastSnapshotAt = new Date();
        await stats.save();
      }
    } catch (error) {
      console.error(`Error updating ${StatsModel.modelName}:`, error);
      throw error;
    }
  }

  async getChartData(timeframe = 'hourly', startDate, endDate) {
    try {
      console.log('Getting chart data for siteId:', this.siteId);
      const StatsModel = this.getStatsModel(timeframe);
      const stats = await StatsModel.findOne({ siteId: this.siteId })
        .populate('analyticsSnapshot.analyticsId');

      console.log('Found stats:', stats);

      if (!stats) {
        console.log('No stats found, returning empty data');
        return this.getEmptyChartData();
      }

      // Get current time for comparison
      const now = new Date();
      const currentTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

      const filteredSnapshots = stats.analyticsSnapshot
        .filter(snapshot => {
          if (!startDate && !endDate) return true;
          const timestamp = snapshot.timestamp;
          return (!startDate || timestamp >= startDate) && 
                 (!endDate || timestamp <= endDate);
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      console.log('Filtered snapshots:', filteredSnapshots);

      // If no snapshots, return empty data
      if (filteredSnapshots.length === 0) {
        console.log('No snapshots found, returning empty data');
        return this.getEmptyChartData();
      }

      // Format the data
      const labels = filteredSnapshots.map(s => s.timestamp.toISOString());
      const visitorsData = filteredSnapshots.map(s => s.visitors || 0);
      const walletsData = filteredSnapshots.map(s => s.wallets || 0);

      const chartData = {
        labels,
        datasets: [
          {
            label: 'Visitors',
            data: visitorsData,
            backgroundColor: 'rgba(252, 211, 77, 0.5)',
            borderColor: '#fcd34d',
            borderWidth: 1
          },
          {
            label: 'Wallets',
            data: walletsData,
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: '#8b5cf6',
            borderWidth: 1
          }
        ]
      };

      console.log('Returning chart data:', chartData);
      return chartData;
    } catch (error) {
      console.error('Error getting chart data:', error);
      return this.getEmptyChartData();
    }
  }

  getStatsModel(timeframe) {
    switch (timeframe.toLowerCase()) {
      case 'hourly': return HourlyStats;
      case 'daily': return DailyStats;
      case 'weekly': return WeeklyStats;
      case 'monthly': return MonthlyStats;
      default: return HourlyStats;
    }
  }

  formatTimestamp(timestamp, timeframe) {
    const date = new Date(timestamp);
    switch (timeframe.toLowerCase()) {
      case 'hourly':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'daily':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      case 'weekly':
        return `Week ${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
      default:
        return date.toLocaleTimeString();
    }
  }

  getEmptyChartData() {
    return {
      labels: [],
      datasets: [
        {
          label: 'Visitors',
          data: [],
          backgroundColor: 'rgba(252, 211, 77, 0.5)',
          borderColor: '#fcd34d',
          borderWidth: 1
        },
        {
          label: 'Wallets',
          data: [],
          backgroundColor: 'rgba(139, 92, 246, 0.7)',
          borderColor: '#8b5cf6',
          borderWidth: 1
        }
      ]
    };
  }

  async getTrafficSources(startDate, endDate) {
    try {
      const StatsModel = this.getStatsModel('daily');
      const stats = await StatsModel.findOne({ siteId: this.siteId })
        .populate('analyticsSnapshot.analyticsId');

      if (!stats) return [];

      const filteredSnapshots = stats.analyticsSnapshot
        .filter(snapshot => {
          if (!startDate && !endDate) return true;
          const timestamp = snapshot.timestamp;
          return (!startDate || timestamp >= startDate) && 
                 (!endDate || timestamp <= endDate);
        });

      // Negative values that indicate no wallet
      const noWalletPhrases = [
        'No Wallet Detected', 
        'No Wallet Connected', 
        'Not Connected', 
        'No Chain Detected', 
        'Error'
      ];
      
      // Process traffic sources data
      const sources = new Map();
      const campaigns = new Map(); // Track campaigns separately
      
      filteredSnapshots.forEach(snapshot => {
        if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
          snapshot.analyticsId.sessions.forEach(session => {
            let source = 'Direct';
            
            // Determine source from UTM data or referrer
            if (session.utmData) {
              if (session.utmData.source) {
                source = session.utmData.source;
              }
              
              // Track campaign data if available
              if (session.utmData.campaign) {
                const campaignKey = session.utmData.utm_id ? 
                  `${session.utmData.campaign}:${session.utmData.utm_id}` : 
                  session.utmData.campaign;
                
                if (!campaigns.has(campaignKey)) {
                  campaigns.set(campaignKey, {
                    name: session.utmData.campaign,
                    utm_id: session.utmData.utm_id || null,
                    visitors: 0,
                    wallets: 0
                  });
                }
                
                const campaignData = campaigns.get(campaignKey);
                campaignData.visitors++;
                if (session.wallet && 
                    session.wallet.walletAddress && 
                    session.wallet.walletAddress.trim() !== '' && 
                    !noWalletPhrases.includes(session.wallet.walletAddress) &&
                    session.wallet.walletAddress.length > 10) {
                  campaignData.wallets++;
                }
              }
            } else if (session.referrer) {
              source = this.normalizeReferrer(session.referrer);
            }
            
            // Initialize source data if not exists
            if (!sources.has(source)) {
              sources.set(source, {
                visitors: 0,
                wallets: 0
              });
            }
            
            // Update metrics
            const sourceData = sources.get(source);
            sourceData.visitors++;
            
            // Count wallets if connected
            if (session.wallet && 
                session.wallet.walletAddress && 
                session.wallet.walletAddress.trim() !== '' && 
                !noWalletPhrases.includes(session.wallet.walletAddress) &&
                session.wallet.walletAddress.length > 10) {
              sourceData.wallets++;
            }
          });
        }
      });

      return {
        sources: Array.from(sources.entries()).map(([source, data]) => ({
          source,
          visitors: data.visitors,
          wallets: data.wallets
        })),
        campaigns: Array.from(campaigns.entries()).map(([key, data]) => ({
          name: data.name,
          utm_id: data.utm_id,
          visitors: data.visitors,
          wallets: data.wallets
        }))
      };
    } catch (error) {
      console.error('Error in getTrafficSources:', error);
      return {
        sources: [],
        campaigns: []
      };
    }
  }

  normalizeReferrer(referrer) {
    try {
      const url = new URL(referrer);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return 'Direct';
    }
  }

  /**
   * Process user journeys by linking sessions from the same user and generating journey analytics
   * @param {string} siteId - The site ID to process journeys for 
   * @returns {Promise<Object>} - Result of the processing
   */
  async processUserJourneys(siteId) {
    try {
      console.log('Processing user journeys for site:', siteId);
      
      // Get the Analytics document
      const analytics = await Analytics.findOne({ siteId }).populate('sessions');
      if (!analytics) {
        console.log(`No analytics found for site: ${siteId}`);
        return { success: false, message: 'No analytics found' };
      }
      
      if (!analytics.sessions) {
        console.log(`Analytics found but sessions array is missing for site: ${siteId}`);
        return { success: false, message: 'No sessions found' };
      }
      
      // Filter out any null or invalid sessions before processing
      const validSessions = analytics.sessions.filter(session => 
        session && session._id && session.userId
      );
      
      if (validSessions.length === 0) {
        console.log('No valid sessions found for site:', siteId);
        return { success: false, message: 'No valid sessions found' };
      }
      
      console.log(`Found ${validSessions.length} valid sessions to process for site ${siteId}`);
      
      // Validate and normalize session data
      const fixedSessions = await this.validateAndFixSessionData(validSessions);
      console.log(`Validated and fixed ${fixedSessions.length} sessions`);
      
      // Group sessions by userId
      const userSessions = {};
      fixedSessions.forEach(session => {
        if (!session.userId) {
          console.log(`Session ${session._id} has no userId, skipping`);
          return;
        }
        
        if (!userSessions[session.userId]) {
          userSessions[session.userId] = [];
        }
        userSessions[session.userId].push(session);
      });
      
      const userCount = Object.keys(userSessions).length;
      console.log(`Found sessions for ${userCount} unique users`);
      
      if (userCount === 0) {
        console.log('No sessions with user IDs found. Cannot create user journeys.');
        return { success: false, message: 'No sessions with user IDs found' };
      }
      
      // Process each user's sessions
      const userJourneys = [];
      let updatedSessionsCount = 0;
      
      // Track common pathways (sequences of pages)
      const pathways = new Map();
      
      for (const [userId, sessions] of Object.entries(userSessions)) {
        // Sort sessions by start time, ensuring we have valid dates
        const validDateSessions = sessions.filter(s => s.startTime && !isNaN(new Date(s.startTime).getTime()));
        
        if (validDateSessions.length === 0) {
          console.log(`User ${userId} has no sessions with valid dates, skipping`);
          continue;
        }
        
        validDateSessions.sort((a, b) => {
          const aTime = new Date(a.startTime).getTime();
          const bTime = new Date(b.startTime).getTime();
          return aTime - bTime;
        });
        
        try {
          // Create/update user journey data
          const userJourney = {
            userId,
            firstVisit: validDateSessions[0].startTime,
            lastVisit: validDateSessions[validDateSessions.length - 1].startTime,
            totalSessions: validDateSessions.length,
            totalPageViews: validDateSessions.reduce((total, session) => {
              // Only count actual page views from data, don't generate placeholder counts
              if (session.visitedPages && Array.isArray(session.visitedPages) && session.visitedPages.length > 0) {
                return total + session.visitedPages.length;
              } else if (typeof session.pagesViewed === 'number' && session.pagesViewed > 0) {
                return total + session.pagesViewed;
              }
              // Don't add placeholder counts
              return total;
            }, 0),
            totalTimeSpent: validDateSessions.reduce((total, session) => total + (session.duration || 0), 0),
            hasConverted: false,
            acquisitionSource: this.getAcquisitionSource(validDateSessions[0])
          };
          
          // Process each session for this user
          let lastSessionId = null;
          for (let i = 0; i < validDateSessions.length; i++) {
            const session = validDateSessions[i];
            const prevSession = i > 0 ? validDateSessions[i-1] : null;
            
            // Update session data
            session.sessionNumber = i + 1;
            
            if (prevSession) {
              // Link to previous session
              session.previousSessionId = prevSession._id;
              
              // Calculate time since last session
              const timeDiff = session.startTime - prevSession.startTime;
              session.timeSinceLastSession = Math.floor(timeDiff / 1000); // in seconds
              
              // Update session and save
              await session.save();
              updatedSessionsCount++;
            }
            
            // Check if this session had a wallet connection
            const noWalletPhrases = [
              'No Wallet Detected', 
              'No Wallet Connected', 
              'Not Connected', 
              'No Chain Detected', 
              'Error'
            ];
            
            const hasWalletConnection = session.wallet && 
              session.wallet.walletAddress && 
              session.wallet.walletAddress.trim() !== '' && 
              !noWalletPhrases.includes(session.wallet.walletAddress) &&
              session.wallet.walletAddress.length > 10;
            
            if (hasWalletConnection) {
              userJourney.hasConverted = true;
              
              // Calculate days to conversion if this is the first conversion
              if (!userJourney.daysToConversion) {
                const msDiff = session.startTime - userJourney.firstVisit;
                userJourney.daysToConversion = Math.floor(msDiff / (1000 * 60 * 60 * 24));
                userJourney.sessionsBeforeConversion = i + 1;
              }
              
              // Process conversion path - if we have page sequence data
              if (session.visitedPages && session.visitedPages.length > 0) {
                const pathToConversion = session.visitedPages.map(p => p.path);
                const pathKey = pathToConversion.join('|');
                
                // Update conversion paths
                this.updateConversionPath(analytics, session, pathToConversion);
              }
            }
            
            // Track page sequences for common pathway analysis
            if (session.visitedPages && session.visitedPages.length > 2) {
              // For sequences of 2-5 pages, track as potential pathways
              for (let start = 0; start < session.visitedPages.length - 1; start++) {
                for (let length = 2; length <= Math.min(5, session.visitedPages.length - start); length++) {
                  const sequence = session.visitedPages.slice(start, start + length).map(p => p.path);
                  const pathKey = sequence.join('|');
                  
                  if (!pathways.has(pathKey)) {
                    pathways.set(pathKey, {
                      sequence,
                      count: 0,
                      conversionCount: 0,
                      totalDuration: 0
                    });
                  }
                  
                  const pathData = pathways.get(pathKey);
                  pathData.count++;
                  
                  // If this session had a conversion, increment the conversion count
                  if (hasWalletConnection) {
                    pathData.conversionCount++;
                  }
                  
                  // Calculate path duration if we have the data
                  let pathDuration = 0;
                  for (let i = start; i < start + length - 1; i++) {
                    if (session.visitedPages[i].duration) {
                      pathDuration += session.visitedPages[i].duration;
                    }
                  }
                  
                  if (pathDuration > 0) {
                    pathData.totalDuration += pathDuration;
                  }
                }
              }
            }
            
            lastSessionId = session._id;
          }
          
          // Add user segment based on behavior
          if (userJourney.hasConverted) {
            userJourney.userSegment = 'converter';
          } else if (userJourney.totalSessions > 3) {
            userJourney.userSegment = 'engaged';
          } else if (userJourney.totalSessions === 1 && validDateSessions[0].isBounce) {
            userJourney.userSegment = 'bounced';
          } else {
            userJourney.userSegment = 'browser';
          }
          
          // Add teamId and siteId to the journey for consistent filtering
          userJourney.teamId = analytics.teamId;
          userJourney.siteId = siteId;
          
          // Add any missing required fields to ensure proper display
          userJourney.websiteName = analytics.siteName || siteId;
          userJourney.websiteDomain = analytics.domain || "unknown";
          
          userJourneys.push(userJourney);
        } catch (journeyError) {
          console.error(`Error processing journey for user ${userId}:`, journeyError);
          // Continue with other users even if one fails
        }
      }
      
      console.log(`Created ${userJourneys.length} user journeys`);
      
      if (userJourneys.length === 0) {
        console.log('Failed to create any user journeys');
        return { success: false, message: 'No user journeys could be created' };
      }
      
      // Update the analytics document with user journeys
      analytics.userJourneys = userJourneys;
      
      // Calculate average metrics
      if (userJourneys.length > 0) {
        analytics.avgSessionsPerUser = userJourneys.reduce((total, journey) => total + journey.totalSessions, 0) / userJourneys.length;
        
        // Calculate average time between sessions for users with multiple sessions
        const multiSessionUsers = userJourneys.filter(journey => journey.totalSessions > 1);
        if (multiSessionUsers.length > 0) {
          let totalTimeBetweenSessions = 0;
          let sessionPairs = 0;
          
          for (const userId in userSessions) {
            const sessions = userSessions[userId];
            if (sessions.length < 2) continue;
            
            for (let i = 1; i < sessions.length; i++) {
              const timeDiff = sessions[i].startTime - sessions[i-1].startTime;
              totalTimeBetweenSessions += timeDiff / 1000; // in seconds
              sessionPairs++;
            }
          }
          
          if (sessionPairs > 0) {
            analytics.avgTimeBetweenSessions = totalTimeBetweenSessions / sessionPairs;
          }
        }
      }
      
      // Update common pathways - convert from Map to array and sort by count
      const sortedPathways = Array.from(pathways.values())
        .map(path => ({
          sequence: path.sequence,
          count: path.count,
          conversionCount: path.conversionCount,
          averageDuration: path.totalDuration > 0 ? path.totalDuration / path.count : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Store top 50 pathways
      
      analytics.commonPathways = sortedPathways;
      
      // Update retention by day
      const retentionData = this.calculateRetentionData(userSessions);
      analytics.retentionByDay = retentionData;
      
      // Cross-device analysis - count users who have sessions from multiple devices
      const crossDeviceCount = Object.values(userSessions).filter(sessions => {
        const uniqueDevices = new Set();
        sessions.forEach(session => {
          if (session.device && session.device.type) {
            uniqueDevices.add(`${session.device.type}|${session.device.os || ''}`);
          }
        });
        return uniqueDevices.size > 1;
      }).length;
      
      analytics.crossDeviceUsers = crossDeviceCount;
      
      // Force update of modified date to ensure changes are tracked
      analytics.markModified('userJourneys');
      
      // Save the analytics document
      try {
        await analytics.save();
        console.log(`Successfully saved analytics with ${userJourneys.length} user journeys`);
      } catch (saveError) {
        console.error('Error saving analytics document:', saveError);
        return { 
          success: false, 
          error: 'Failed to save user journeys',
          details: saveError.message
        };
      }
      
      return {
        success: true,
        usersProcessed: Object.keys(userSessions).length,
        sessionsUpdated: updatedSessionsCount,
        journeysCreated: userJourneys.length,
        pathwaysTracked: 0  // We'll skip pathways tracking for now to simplify
      };
    } catch (error) {
      console.error('Error processing user journeys:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper function to determine acquisition source
  getAcquisitionSource(session) {
    if (session.utmData && session.utmData.source) {
      return `${session.utmData.source}${session.utmData.medium ? '/' + session.utmData.medium : ''}`;
    } else if (session.referrer) {
      return `referral/${this.normalizeReferrer(session.referrer)}`;
    }
    return 'direct';
  }

  // Helper function to update conversion path analytics
  updateConversionPath(analytics, session, pathToConversion) {
    const sourceMedium = 
      session.utmData && session.utmData.source ? 
        `${session.utmData.source}/${session.utmData.medium || 'none'}` : 
        session.referrer ? `referral/${this.normalizeReferrer(session.referrer)}` : 'direct';
    
    // Find existing path or create new one
    let conversionPath = analytics.conversionPaths.find(p => 
      p.sourceMedium === sourceMedium && 
      p.pathToConversion.join('|') === pathToConversion.join('|')
    );
    
    if (!conversionPath) {
      conversionPath = {
        sourceMedium,
        pathToConversion,
        conversionCount: 0,
        avgTimeToConversion: 0
      };
      analytics.conversionPaths.push(conversionPath);
    }
    
    // Update conversion count and time
    const prevCount = conversionPath.conversionCount;
    const prevAvgTime = conversionPath.avgTimeToConversion;
    
    conversionPath.conversionCount++;
    
    // Calculate new average time (if we have duration data)
    if (session.duration) {
      conversionPath.avgTimeToConversion = 
        (prevAvgTime * prevCount + session.duration) / conversionPath.conversionCount;
    }
  }

  // Helper function to calculate retention data
  calculateRetentionData(userSessions) {
    // Track users by day since first visit
    const usersByDay = {};
    const firstVisitDates = {};
    
    // First, find each user's first visit date
    Object.entries(userSessions).forEach(([userId, sessions]) => {
      const firstSession = sessions.reduce((earliest, session) => 
        !earliest || session.startTime < earliest.startTime ? session : earliest, null);
      
      if (firstSession) {
        firstVisitDates[userId] = firstSession.startTime;
      }
    });
    
    // Now track return visits by day
    Object.entries(userSessions).forEach(([userId, sessions]) => {
      const firstVisit = firstVisitDates[userId];
      if (!firstVisit) return;
      
      // Count users for each day they visited (0, 1, 7, 30, etc.)
      sessions.forEach(session => {
        const dayDiff = Math.floor((session.startTime - firstVisit) / (1000 * 60 * 60 * 24));
        
        if (!usersByDay[dayDiff]) {
          usersByDay[dayDiff] = new Set();
        }
        usersByDay[dayDiff].add(userId);
      });
    });
    
    // Convert to array of day, count, percentage
    const totalUsers = Object.keys(firstVisitDates).length;
    const retentionData = Object.entries(usersByDay)
      .map(([day, userSet]) => ({
        day: parseInt(day),
        count: userSet.size,
        percentage: totalUsers > 0 ? (userSet.size / totalUsers) * 100 : 0
      }))
      .sort((a, b) => a.day - b.day);
    
    return retentionData;
  }

  /**
   * Process all user journeys for a site and update analytics
   * @param {string} siteId - The site ID to process
   * @returns {Promise<Object>} - Result of processing
   */
  static async processAllUserJourneys(siteId) {
    try {
      console.log(`Starting user journey processing for site: ${siteId}`);
      
      if (!siteId) {
        console.error('No siteId provided for journey processing');
        return { 
          success: false, 
          error: 'Site ID is required',
          message: 'No site ID was provided'
        };
      }
      
      // Create processor instance
      const processor = new AnalyticsProcessor(siteId);
      
      // Process journeys
      try {
        const result = await processor.processUserJourneys(siteId);
        console.log(`Completed user journey processing for site: ${siteId}`, result);
        return result;
      } catch (processingError) {
        console.error(`Error in journey processing for site ${siteId}:`, processingError);
        return { 
          success: false, 
          error: 'Failed to process user journeys',
          message: processingError.message || 'An error occurred during journey processing'
        };
      }
    } catch (error) {
      console.error(`Error setting up journey processing for site ${siteId}:`, error);
      return { 
        success: false, 
        error: 'Failed to initialize journey processing',
        message: error.message
      };
    }
  }

  /**
   * Validates and fixes session data to ensure consistency
   * @param {Array} sessions - Array of session objects
   * @returns {Promise<Array>} - Array of validated and fixed sessions
   */
  async validateAndFixSessionData(sessions) {
    const fixedSessions = [];
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const session of sessions) {
      try {
        // Skip null or invalid sessions
        if (!session || !session._id) {
          console.log('Skipping null or invalid session');
          skippedCount++;
          continue;
        }
        
        let wasFixed = false;
        
        // Use try/catch when calling toObject() as it might fail on invalid objects
        let fixedSession;
        try {
          fixedSession = { ...session.toObject() };
        } catch (objError) {
          console.error(`Error converting session to object: ${session._id}`, objError);
          skippedCount++;
          continue;
        }
        
        // Ensure visitedPages is an array
        if (!fixedSession.visitedPages) {
          fixedSession.visitedPages = [];
          wasFixed = true;
        }
        
        // Ensure pagesViewed count matches visitedPages length if visitedPages exists
        if (Array.isArray(fixedSession.visitedPages) && fixedSession.visitedPages.length > 0) {
          if (typeof fixedSession.pagesViewed !== 'number' || 
              fixedSession.pagesViewed !== fixedSession.visitedPages.length) {
            fixedSession.pagesViewed = fixedSession.visitedPages.length;
            wasFixed = true;
          }
        }
        
        // Ensure duration is calculated properly if we have timestamps
        if (typeof fixedSession.duration !== 'number' || fixedSession.duration <= 0) {
          if (fixedSession.startTime && fixedSession.endTime) {
            try {
              const startTime = new Date(fixedSession.startTime);
              const endTime = new Date(fixedSession.endTime);
              
              // Check if dates are valid
              if (!isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
                fixedSession.duration = Math.floor((endTime - startTime) / 1000);
                if (fixedSession.duration < 0) {
                  // Fix negative duration (end before start)
                  fixedSession.duration = 0;
                }
                wasFixed = true;
              }
            } catch (dateError) {
              console.error(`Error calculating duration for session ${fixedSession._id}:`, dateError);
              // Set a default duration
              fixedSession.duration = 0;
              wasFixed = true;
            }
          }
        }
        
        // If fixes were made, save the session
        if (wasFixed) {
          try {
            // Find and update the original session in the database
            await session.model('Session').findByIdAndUpdate(
              session._id,
              {
                $set: {
                  visitedPages: fixedSession.visitedPages,
                  pagesViewed: fixedSession.pagesViewed,
                  duration: fixedSession.duration
                }
              }
            );
            fixedCount++;
          } catch (error) {
            console.error(`Error updating session ${session._id}:`, error);
          }
        }
        
        fixedSessions.push(wasFixed ? fixedSession : session);
      } catch (sessionError) {
        console.error('Error processing session:', sessionError);
        skippedCount++;
      }
    }
    
    console.log(`Fixed ${fixedCount} sessions with data inconsistencies, skipped ${skippedCount} invalid sessions`);
    return fixedSessions;
  }
}

module.exports = AnalyticsProcessor; 