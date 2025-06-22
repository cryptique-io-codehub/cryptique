// Simple Migration Runner - bypasses the problematic database config
require('dotenv').config();
const mongoose = require('mongoose');

// Set environment variables
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';

// Import models directly
const Analytics = require('./models/analytics');
const Session = require('./models/session');
const TimeseriesStat = require('./models/timeseriesStats');
const User = require('./models/user');
const Team = require('./models/team');
const GranularEvent = require('./models/granularEvents');

// Import old models for migration
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('./models/stats');

class SimpleMigration {
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

  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI;
      this.log(`Connecting to MongoDB...`);
      
      // Use simple connection without problematic options
      await mongoose.connect(mongoUri);
      this.log('✅ Connected to database successfully');
      return true;
    } catch (error) {
      this.log(`❌ Database connection failed: ${error.message}`);
      throw error;
    }
  }

  async run() {
    try {
      // Connect to database
      await this.connect();

      // Check if migration already ran
      const existingTimeseries = await TimeseriesStat.countDocuments({});
      this.log(`Found ${existingTimeseries} existing timeseries records`);

      if (existingTimeseries > 0) {
        this.log('⚠️ Migration appears to have already run partially');
        this.log('Proceeding with remaining steps...');
      }

      // Step 1: Migrate stats collections to time series (if needed)
      if (existingTimeseries === 0) {
        await this.migrateStatsToTimeSeries();
      } else {
        this.log('⏭️ Skipping stats migration (already done)');
      }

      // Step 2: Update analytics documents
      await this.updateAnalyticsDocuments();

      // Step 3: Update session documents
      await this.updateSessionDocuments();

      // Step 4: Update granular events with TTL
      await this.updateGranularEvents();

      // Step 5: Create indexes
      await this.createOptimizedIndexes();

      this.log('🎉 Phase 1 migration completed successfully');
      return { success: true, log: this.migrationLog };

    } catch (error) {
      this.log(`💥 Migration failed: ${error.message}`);
      throw error;
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
        this.log('🔌 Disconnected from database');
      }
    }
  }

  async migrateStatsToTimeSeries() {
    this.log('📊 Starting stats migration to time series...');

    const collections = [
      { model: HourlyStats, granularity: 'hourly' },
      { model: DailyStats, granularity: 'daily' },
      { model: WeeklyStats, granularity: 'weekly' },
      { model: MonthlyStats, granularity: 'monthly' }
    ];

    for (const { model, granularity } of collections) {
      try {
        const count = await model.countDocuments({});
        this.log(`📈 Found ${count} ${granularity} stats records`);

        if (count === 0) {
          this.log(`⏭️ No ${granularity} stats to migrate`);
          continue;
        }

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
                    uniqueVisitors: snapshot.visitors || 0,
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

          this.log(`⚡ Processed ${processed} ${granularity} time series records`);
        }

        this.log(`✅ Completed migration of ${granularity} stats: ${processed} records`);
      } catch (error) {
        this.log(`❌ Error migrating ${granularity} stats: ${error.message}`);
      }
    }
  }

  async updateAnalyticsDocuments() {
    this.log('📊 Updating analytics documents...');

    const count = await Analytics.countDocuments({});
    this.log(`📈 Found ${count} analytics documents to update`);

    if (count === 0) {
      this.log('⏭️ No analytics documents to update');
      return;
    }

    let processed = 0;
    for (let skip = 0; skip < count; skip += this.batchSize) {
      const analyticsArray = await Analytics.find({}).skip(skip).limit(this.batchSize);

      for (const analytics of analyticsArray) {
        try {
          // Check if already updated
          if (analytics.summaryMetrics) {
            continue; // Skip already updated documents
          }

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

          // Set TTL (2 years)
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 2);
          updates.expiresAt = expiresAt;

          await Analytics.updateOne(
            { _id: analytics._id },
            { $set: updates }
          );

          processed++;
        } catch (error) {
          this.log(`❌ Error updating analytics ${analytics._id}: ${error.message}`);
        }
      }

      this.log(`⚡ Updated ${processed}/${count} analytics documents`);
    }

    this.log(`✅ Analytics documents update completed: ${processed} updated`);
  }

  async updateSessionDocuments() {
    this.log('🔗 Updating session documents...');

    const count = await Session.countDocuments({});
    this.log(`📈 Found ${count} session documents to update`);

    if (count === 0) {
      this.log('⏭️ No session documents to update');
      return;
    }

    let processed = 0;
    for (let skip = 0; skip < count; skip += this.batchSize) {
      const sessions = await Session.find({}).skip(skip).limit(this.batchSize);

      for (const session of sessions) {
        try {
          // Check if already updated
          if (session.expiresAt) {
            continue; // Skip already updated documents
          }

          const updates = {};

          // Set TTL (1 year)
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
          updates.expiresAt = expiresAt;

          // Add vector search fields if not present
          if (!session.vectorEmbedding) {
            updates.vectorEmbedding = null;
            updates.vectorMetadata = {
              hasEmbedding: false,
              lastEmbeddingUpdate: null,
              embeddingVersion: '1.0'
            };
          }

          await Session.updateOne(
            { _id: session._id },
            { $set: updates }
          );

          processed++;
        } catch (error) {
          this.log(`❌ Error updating session ${session._id}: ${error.message}`);
        }
      }

      this.log(`⚡ Updated ${processed}/${count} session documents`);
    }

    this.log(`✅ Session documents update completed: ${processed} updated`);
  }

  async updateGranularEvents() {
    this.log('⚡ Updating granular events with TTL...');

    const count = await GranularEvent.countDocuments({});
    this.log(`📈 Found ${count} granular event documents`);

    if (count === 0) {
      this.log('⏭️ No granular events to update');
      return;
    }

    // Set TTL for automatic cleanup (6 months)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const result = await GranularEvent.updateMany(
      { expiresAt: { $exists: false } },
      { $set: { expiresAt: expiresAt } }
    );

    this.log(`✅ Updated ${result.modifiedCount} granular events with TTL`);
  }

  async createOptimizedIndexes() {
    this.log('🔍 Creating optimized indexes...');

    try {
      // TimeseriesStat indexes
      await TimeseriesStat.collection.createIndex(
        { "metadata.siteId": 1, "metadata.granularity": 1, "timestamp": 1 },
        { background: true }
      );
      this.log('✅ Created TimeseriesStat compound index');

      // Analytics indexes
      await Analytics.collection.createIndex(
        { "siteId": 1 },
        { background: true }
      );
      this.log('✅ Created Analytics siteId index');

      // Session indexes
      await Session.collection.createIndex(
        { "siteId": 1, "startTime": -1 },
        { background: true }
      );
      await Session.collection.createIndex(
        { "expiresAt": 1 },
        { expireAfterSeconds: 0, background: true }
      );
      this.log('✅ Created Session indexes with TTL');

      // GranularEvent TTL index
      await GranularEvent.collection.createIndex(
        { "expiresAt": 1 },
        { expireAfterSeconds: 0, background: true }
      );
      this.log('✅ Created GranularEvent TTL index');

      this.log('🎯 All indexes created successfully');
    } catch (error) {
      this.log(`❌ Error creating indexes: ${error.message}`);
    }
  }
}

// Run the migration
async function runMigration() {
  console.log('🚀 Starting Simple Phase 1 Migration...');
  
  try {
    const migration = new SimpleMigration();
    const result = await migration.run();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📊 Summary:', {
      success: result.success,
      totalLogEntries: result.log.length
    });
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  runMigration();
}

module.exports = SimpleMigration; 