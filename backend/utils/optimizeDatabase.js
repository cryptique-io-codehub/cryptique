/**
 * Database optimization script for improving Analytics query performance
 * Run this script to add proper indexes to the MongoDB collections
 */

const mongoose = require('mongoose');
const Analytics = require('../models/analytics');
const Session = require('../models/session');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../models/stats');

async function optimizeDatabase() {
  try {
    console.log('Starting database optimization...');

    // Helper function to create index safely
    const createIndexSafely = async (collection, indexSpec, options = {}) => {
      try {
        await collection.createIndex(indexSpec, options);
        console.log(`✓ Created index: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        if (error.code === 86) { // IndexKeySpecsConflict
          console.log(`⚠ Index already exists: ${JSON.stringify(indexSpec)}`);
        } else {
          console.error(`✗ Failed to create index ${JSON.stringify(indexSpec)}:`, error.message);
        }
      }
    };

    // Create indexes for Analytics collection
    console.log('Creating indexes for Analytics collection...');
    
    // Primary query index - siteId is the most common lookup
    await createIndexSafely(Analytics.collection, { siteId: 1 }, { unique: true });
    
    // Compound indexes for common queries
    await createIndexSafely(Analytics.collection, { siteId: 1, totalVisitors: -1 });
    await createIndexSafely(Analytics.collection, { siteId: 1, uniqueVisitors: -1 });
    await createIndexSafely(Analytics.collection, { siteId: 1, web3Visitors: -1 });
    
    // Create indexes for Session collection
    console.log('Creating indexes for Session collection...');
    await createIndexSafely(Session.collection, { sessionId: 1 }, { unique: true });
    await createIndexSafely(Session.collection, { siteId: 1 });
    await createIndexSafely(Session.collection, { userId: 1 });
    await createIndexSafely(Session.collection, { startTime: -1 });
    await createIndexSafely(Session.collection, { siteId: 1, startTime: -1 });

    // Create indexes for Stats collections
    console.log('Creating indexes for Stats collections...');
    
    // HourlyStats indexes
    await createIndexSafely(HourlyStats.collection, { siteId: 1 }, { unique: true });
    await createIndexSafely(HourlyStats.collection, { lastSnapshotAt: -1 });
    await createIndexSafely(HourlyStats.collection, { 'analyticsSnapshot.timestamp': -1 });
    
    // DailyStats indexes
    await createIndexSafely(DailyStats.collection, { siteId: 1 }, { unique: true });
    await createIndexSafely(DailyStats.collection, { lastSnapshotAt: -1 });
    await createIndexSafely(DailyStats.collection, { 'analyticsSnapshot.timestamp': -1 });
    
    // WeeklyStats indexes
    await createIndexSafely(WeeklyStats.collection, { siteId: 1 }, { unique: true });
    await createIndexSafely(WeeklyStats.collection, { lastSnapshotAt: -1 });
    
    // MonthlyStats indexes
    await createIndexSafely(MonthlyStats.collection, { siteId: 1 }, { unique: true });
    await createIndexSafely(MonthlyStats.collection, { lastSnapshotAt: -1 });

    console.log('Database optimization completed successfully!');
    
    // Display current indexes for verification
    console.log('\n--- Current Indexes ---');
    const analyticsIndexes = await Analytics.collection.listIndexes().toArray();
    console.log('Analytics indexes:', analyticsIndexes.map(idx => idx.key));
    
    const sessionIndexes = await Session.collection.listIndexes().toArray();
    console.log('Session indexes:', sessionIndexes.map(idx => idx.key));
    
    const hourlyIndexes = await HourlyStats.collection.listIndexes().toArray();
    console.log('HourlyStats indexes:', hourlyIndexes.map(idx => idx.key));
    
    return true;
  } catch (error) {
    console.error('Error optimizing database:', error);
    return false;
  }
}

// Export for use in other scripts
module.exports = { optimizeDatabase };

// Run directly if this file is executed
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique';
  
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('Connected to MongoDB');
      return optimizeDatabase();
    })
    .then((success) => {
      if (success) {
        console.log('Database optimization completed successfully');
      } else {
        console.log('Database optimization failed');
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database connection error:', error);
      process.exit(1);
    });
}