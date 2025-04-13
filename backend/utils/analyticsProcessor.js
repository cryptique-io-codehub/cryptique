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
      const StatsModel = this.getStatsModel(timeframe);
      const stats = await StatsModel.findOne({ siteId: this.siteId })
        .populate('analyticsSnapshot.analyticsId');

      if (!stats) return this.getEmptyChartData();

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

      // If no snapshots, return empty data
      if (filteredSnapshots.length === 0) {
        return this.getEmptyChartData();
      }

      // Format the data
      const labels = filteredSnapshots.map(s => s.timestamp.toISOString());
      const visitorsData = filteredSnapshots.map(s => s.visitors || 0);
      const walletsData = filteredSnapshots.map(s => s.wallets || 0);

      return {
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

      // Process traffic sources data
      const sources = new Map();
      
      filteredSnapshots.forEach(snapshot => {
        if (snapshot.analyticsId && snapshot.analyticsId.sessions) {
          snapshot.analyticsId.sessions.forEach(session => {
            let source = 'Direct';
            
            // Determine source from UTM data or referrer
            if (session.utmData && session.utmData.source) {
              source = session.utmData.source;
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
            if (session.wallet && session.wallet.walletAddress) {
              sourceData.wallets++;
            }
          });
        }
      });

      // Convert to array format
      return Array.from(sources.entries()).map(([source, data]) => ({
        source,
        visitors: data.visitors,
        wallets: data.wallets
      }));
    } catch (error) {
      console.error('Error getting traffic sources:', error);
      return [];
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
}

module.exports = AnalyticsProcessor; 