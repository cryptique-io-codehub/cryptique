// Set environment variables directly for testing
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';

const mongoose = require('mongoose');
const { connectToDatabase } = require('../../config/database');

// Import models
const Analytics = require('../../models/analytics');
const Session = require('../../models/session');
const TimeseriesStat = require('../../models/timeseriesStats');
const User = require('../../models/user');
const Team = require('../../models/team');
const GranularEvent = require('../../models/granularEvents');

// Import old models for migration
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../../models/stats');

class Phase1Migration {
  constructor() {
    this.batchSize = 100;
    this.migrationLog = [];
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    this.migrationLog.push(logMessage);
  }

  async run() {
    try {
      await connectToDatabase();
      this.log('Connected to database for Phase 1 migration');

      // Step 1: Migrate stats collections to time series
      await this.migrateStatsToTimeSeries();

      // Step 2: Update analytics documents
      await this.updateAnalyticsDocuments();

      // Step 3: Update session documents
      await this.updateSessionDocuments();

      // Step 4: Update user-team relationships
      await this.updateUserTeamRelationships();

      // Step 5: Update granular events with TTL
      await this.updateGranularEvents();

      // Step 6: Create indexes
      await this.createOptimizedIndexes();

      // Step 7: Cleanup old collections (optional)
      await this.cleanupOldCollections();

      this.log('Phase 1 migration completed successfully');
      return { success: true, log: this.migrationLog };

    } catch (error) {
      this.log(`Migration failed: ${error.message}`);
      throw error;
    }
  }

  async migrateStatsToTimeSeries() {
    this.log('Starting stats migration to time series...');

    const collections = [
      { model: HourlyStats, granularity: 'hourly' },
      { model: DailyStats, granularity: 'daily' },
      { model: WeeklyStats, granularity: 'weekly' },
      { model: MonthlyStats, granularity: 'monthly' }
    ];

    for (const { model, granularity } of collections) {
      try {
        const count = await model.countDocuments({});
        this.log(`Migrating ${count} ${granularity} stats records...`);

        let processed = 0;
        for (let skip = 0; skip < count; skip += this.batchSize) {
          const stats = await model.find({}).skip(skip).limit(this.batchSize);
          
          const timeseriesDocs = [];
          for (const stat of stats) {
            if (stat.analyticsSnapshot && stat.analyticsSnapshot.length > 0) {
              for (const snapshot of stat.analyticsSnapshot) {
                timeseriesDocs.push({
                  timestamp: snapshot.timestamp,
                  metadata: {
                    siteId: stat.siteId,
                    granularity: granularity,
                    analyticsId: snapshot.analyticsId,
                    timezone: stat.timezone || 'UTC'
                  },
                  metrics: {
                    visitors: snapshot.visitors || 0,
                    uniqueVisitors: snapshot.visitors || 0, // Fallback
                    web3Users: snapshot.web3Users || 0,
                    walletsConnected: snapshot.walletsConnected || 0,
                    pageViews: snapshot.pageViews || 0,
                    newVisitors: 0,
                    returningVisitors: 0,
                    bounceRate: 0,
                    avgSessionDuration: 0,
                    totalSessions: snapshot.visitors || 0
                  }
                });
              }
            }
          }

          if (timeseriesDocs.length > 0) {
            await TimeseriesStat.insertMany(timeseriesDocs, { ordered: false });
            processed += timeseriesDocs.length;
          }

          this.log(`Processed ${processed} ${granularity} time series records`);
        }

        this.log(`Completed migration of ${granularity} stats: ${processed} records`);
      } catch (error) {
        this.log(`Error migrating ${granularity} stats: ${error.message}`);
      }
    }
  }

  async updateAnalyticsDocuments() {
    this.log('Updating analytics documents...');

    const count = await Analytics.countDocuments({});
    this.log(`Updating ${count} analytics documents...`);

    let processed = 0;
    for (let skip = 0; skip < count; skip += this.batchSize) {
      const analyticsArray = await Analytics.find({}).skip(skip).limit(this.batchSize);

      for (const analytics of analyticsArray) {
        try {
          // Convert old structure to new structure
          const updates = {
            'summaryMetrics.totalVisitors': analytics.totalVisitors || 0,
            'summaryMetrics.uniqueVisitors': analytics.uniqueVisitors || 0,
            'summaryMetrics.web3Visitors': analytics.web3Visitors || 0,
            'summaryMetrics.totalPageViews': analytics.totalPageViews || 0,
            'summaryMetrics.newVisitors': analytics.newVisitors || 0,
            'summaryMetrics.returningVisitors': analytics.returningVisitors || 0,
            'summaryMetrics.walletsConnected': analytics.walletsConnected || 0,
            'summaryMetrics.avgSessionDuration': 0,
            'summaryMetrics.bounceRate': 0,
            'metadata.lastProcessed': new Date(),
            'metadata.dataQuality': 'good',
            'metadata.processingVersion': '2.0'
          };

          // Set TTL
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 2);
          updates.expiresAt = expiresAt;

          await Analytics.updateOne(
            { _id: analytics._id },
            { $set: updates, $unset: {
              totalVisitors: 1,
              uniqueVisitors: 1,
              web3Visitors: 1,
              totalPageViews: 1,
              newVisitors: 1,
              returningVisitors: 1,
              walletsConnected: 1,
              hourlyStats: 1,
              dailyStats: 1,
              weeklyStats: 1,
              monthlyStats: 1,
              userAgents: 1,
              commonPathways: 1,
              userJourneys: 1,
              retentionByDay: 1,
              conversionPaths: 1,
              crossDeviceUsers: 1,
              avgSessionsPerUser: 1,
              avgTimeBetweenSessions: 1,
              avgDaysActive: 1
            }}
          );

          processed++;
        } catch (error) {
          this.log(`Error updating analytics ${analytics._id}: ${error.message}`);
        }
      }

      this.log(`Updated ${processed}/${count} analytics documents`);
    }
  }

  async updateSessionDocuments() {
    this.log('Updating session documents...');

    const count = await Session.countDocuments({});
    this.log(`Updating ${count} session documents...`);

    let processed = 0;
    for (let skip = 0; skip < count; skip += this.batchSize) {
      const sessions = await Session.find({}).skip(skip).limit(this.batchSize);

      for (const session of sessions) {
        try {
          // Set TTL for sessions
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);

          await Session.updateOne(
            { _id: session._id },
            { $set: { expiresAt } }
          );

          processed++;
        } catch (error) {
          this.log(`Error updating session ${session._id}: ${error.message}`);
        }
      }

      this.log(`Updated ${processed}/${count} session documents`);
    }
  }

  async updateUserTeamRelationships() {
    this.log('Updating user-team relationships...');

    const users = await User.find({});
    this.log(`Updating ${users.length} user documents...`);

    for (const user of users) {
      try {
        const updates = {
          accountStatus: user.isVerified ? 'active' : 'pending_verification',
          lastActiveAt: user.updatedAt || new Date(),
          preferences: {
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            emailNotifications: true,
            dashboardLayout: 'default'
          }
        };

        // Convert old team array to new structure
        if (user.team && user.team.length > 0) {
          updates.teamIds = user.team;
          updates.primaryTeamId = user.team[0];
        }

        await User.updateOne(
          { _id: user._id },
          { 
            $set: updates,
            $unset: { team: 1 }
          }
        );

      } catch (error) {
        this.log(`Error updating user ${user._id}: ${error.message}`);
      }
    }

    // Update teams
    const teams = await Team.find({});
    this.log(`Updating ${teams.length} team documents...`);

    for (const team of teams) {
      try {
        const updates = {
          status: 'active',
          settings: {
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
            emailNotifications: true,
            dataRetentionDays: 365
          }
        };

        // Convert old user array to new members structure
        if (team.user && team.user.length > 0) {
          updates.members = team.user.map(userRef => ({
            userId: userRef.userId,
            role: userRef.role || 'user',
            joinedAt: new Date(),
            status: 'active'
          }));
        }

        // Add usage tracking
        updates['subscription.usage'] = {
          websites: team.websites ? team.websites.length : 0,
          smartContracts: 0,
          apiCalls: 0,
          lastResetAt: new Date()
        };

        // Add limits based on plan
        const plan = team.subscription?.plan || 'offchain';
        const limits = this.getPlanLimits(plan);
        updates['subscription.limits'] = limits;

        await Team.updateOne(
          { _id: team._id },
          { 
            $set: updates,
            $unset: { user: 1 }
          }
        );

      } catch (error) {
        this.log(`Error updating team ${team._id}: ${error.message}`);
      }
    }
  }

  getPlanLimits(plan) {
    const limits = {
      offchain: { websites: 1, smartContracts: 0, apiCalls: 0, teamMembers: 1 },
      basic: { websites: 2, smartContracts: 1, apiCalls: 40000, teamMembers: 2 },
      pro: { websites: 5, smartContracts: 5, apiCalls: 150000, teamMembers: 5 },
      enterprise: { websites: 999, smartContracts: 999, apiCalls: 999999, teamMembers: 999 }
    };
    return limits[plan] || limits.offchain;
  }

  async updateGranularEvents() {
    this.log('Updating granular events with TTL...');

    const count = await GranularEvent.countDocuments({});
    this.log(`Updating ${count} granular event documents...`);

    let processed = 0;
    for (let skip = 0; skip < count; skip += this.batchSize) {
      const events = await GranularEvent.find({}).skip(skip).limit(this.batchSize);

      for (const event of events) {
        try {
          // Set TTL based on event type
          const expiresAt = new Date();
          if (event.eventType === 'pageView') {
            expiresAt.setDate(expiresAt.getDate() + 60);
          } else if (event.eventType === 'walletConnect') {
            expiresAt.setDate(expiresAt.getDate() + 365);
          } else if (event.eventType === 'click') {
            expiresAt.setDate(expiresAt.getDate() + 90);
          } else {
            expiresAt.setDate(expiresAt.getDate() + 120);
          }

          await GranularEvent.updateOne(
            { _id: event._id },
            { $set: { expiresAt } }
          );

          processed++;
        } catch (error) {
          this.log(`Error updating granular event ${event._id}: ${error.message}`);
        }
      }

      this.log(`Updated ${processed}/${count} granular event documents`);
    }
  }

  async createOptimizedIndexes() {
    this.log('Creating optimized indexes...');

    try {
      // Create indexes for TimeseriesStat
      await TimeseriesStat.createIndexes();
      this.log('Created TimeseriesStat indexes');

      // Create indexes for Analytics
      await Analytics.createIndexes();
      this.log('Created Analytics indexes');

      // Create indexes for Session
      await Session.createIndexes();
      this.log('Created Session indexes');

      // Create indexes for User
      await User.createIndexes();
      this.log('Created User indexes');

      // Create indexes for Team
      await Team.createIndexes();
      this.log('Created Team indexes');

      // Create indexes for GranularEvent
      await GranularEvent.createIndexes();
      this.log('Created GranularEvent indexes');

    } catch (error) {
      this.log(`Error creating indexes: ${error.message}`);
    }
  }

  async cleanupOldCollections() {
    this.log('Cleaning up old collections...');

    try {
      // This is optional and should be done carefully
      // Uncomment only after verifying migration success
      
      // await mongoose.connection.db.collection('hourlystats').drop();
      // this.log('Dropped hourlystats collection');
      
      // await mongoose.connection.db.collection('dailystats').drop();
      // this.log('Dropped dailystats collection');
      
      // await mongoose.connection.db.collection('weeklystats').drop();
      // this.log('Dropped weeklystats collection');
      
      // await mongoose.connection.db.collection('monthlystats').drop();
      // this.log('Dropped monthlystats collection');

      this.log('Old collections cleanup skipped (safety measure)');
      this.log('To cleanup old collections, uncomment the drop statements in cleanupOldCollections method');
      
    } catch (error) {
      this.log(`Error during cleanup: ${error.message}`);
    }
  }

  async rollback() {
    this.log('Starting migration rollback...');
    
    try {
      // This is a simplified rollback - in production you'd want more sophisticated rollback logic
      await TimeseriesStat.deleteMany({});
      this.log('Cleared TimeseriesStat collection');
      
      this.log('Rollback completed - manual restoration of original data may be required');
    } catch (error) {
      this.log(`Error during rollback: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function runMigration() {
  const migration = new Phase1Migration();
  
  try {
    const result = await migration.run();
    console.log('\n=== MIGRATION COMPLETED ===');
    console.log('Log entries:', result.log.length);
    
    // Write log to file
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, `migration-log-${Date.now()}.txt`);
    fs.writeFileSync(logFile, result.log.join('\n'));
    console.log(`Migration log written to: ${logFile}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Export for use in other scripts
module.exports = Phase1Migration;

// Run if called directly
if (require.main === module) {
  runMigration();
} 