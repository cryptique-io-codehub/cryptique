/**
 * Database migration script to create optimized indexes for Stats collections
 * This script ensures all performance-critical indexes are created for existing databases
 * Includes TTL indexes for automatic data cleanup based on retention policies
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectToDatabase } = require('../config/database');

async function createStatsIndexes() {
  try {
    console.log('🚀 Starting Stats collections index creation...');
    console.log('🔍 MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    // Connect to MongoDB using existing config
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    
    // Define all stats collections
    const statsCollections = [
      { name: 'hourlystats', displayName: 'HourlyStats', ttlSeconds: 604800 }, // 7 days
      { name: 'dailystats', displayName: 'DailyStats', ttlSeconds: 7776000 }, // 90 days
      { name: 'weeklystats', displayName: 'WeeklyStats', ttlSeconds: 31536000 }, // 1 year
      { name: 'monthlystats', displayName: 'MonthlyStats', ttlSeconds: 157680000 } // 5 years
    ];
    
    console.log('📊 Creating performance indexes for Stats collections...');
    
    // Define base indexes that apply to all stats collections
    const baseIndexOperations = [
      // Primary siteId index (unique)
      {
        name: 'siteId_1',
        spec: { siteId: 1 },
        options: { background: true, unique: true }
      },
      
      // Timestamp indexes for time-series queries
      {
        name: 'analyticsSnapshot.timestamp_1',
        spec: { 'analyticsSnapshot.timestamp': 1 },
        options: { background: true }
      },
      
      // Compound index for site-specific time queries (ascending)
      {
        name: 'siteId_1_analyticsSnapshot.timestamp_1',
        spec: { siteId: 1, 'analyticsSnapshot.timestamp': 1 },
        options: { background: true }
      },
      
      // Compound index for site-specific time queries (descending - most recent first)
      {
        name: 'siteId_1_analyticsSnapshot.timestamp_-1',
        spec: { siteId: 1, 'analyticsSnapshot.timestamp': -1 },
        options: { background: true }
      },
      
      // Index for incremental updates
      {
        name: 'siteId_1_lastSnapshotAt_-1',
        spec: { siteId: 1, lastSnapshotAt: -1 },
        options: { background: true }
      },
      
      // Analytics ID lookups
      {
        name: 'analyticsSnapshot.analyticsId_1',
        spec: { 'analyticsSnapshot.analyticsId': 1 },
        options: { background: true, sparse: true }
      },
      
      // Metrics-based queries for performance analytics
      {
        name: 'siteId_1_analyticsSnapshot.visitors_-1',
        spec: { siteId: 1, 'analyticsSnapshot.visitors': -1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_analyticsSnapshot.walletsConnected_-1',
        spec: { siteId: 1, 'analyticsSnapshot.walletsConnected': -1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_analyticsSnapshot.pageViews_-1',
        spec: { siteId: 1, 'analyticsSnapshot.pageViews': -1 },
        options: { background: true }
      },
      
      // Timezone-based queries
      {
        name: 'siteId_1_timezone_1',
        spec: { siteId: 1, timezone: 1 },
        options: { background: true }
      }
    ];
    
    let totalCreated = 0;
    let totalSkipped = 0;
    
    // Process each stats collection
    for (const collectionInfo of statsCollections) {
      console.log(`\n📈 Processing ${collectionInfo.displayName} collection...`);
      
      const collection = db.collection(collectionInfo.name);
      
      // Check if collection exists
      const collections = await db.listCollections({ name: collectionInfo.name }).toArray();
      if (collections.length === 0) {
        console.log(`⚠️  ${collectionInfo.displayName} collection does not exist yet. Indexes will be created when first document is inserted.`);
        continue;
      }
      
      // Get existing indexes
      const existingIndexes = await collection.indexes();
      const existingIndexNames = existingIndexes.map(idx => idx.name);
      
      console.log(`📋 Found ${existingIndexes.length} existing indexes in ${collectionInfo.displayName}`);
      
      // Create base indexes
      let createdCount = 0;
      let skippedCount = 0;
      
      for (const indexOp of baseIndexOperations) {
        try {
          if (existingIndexNames.includes(indexOp.name)) {
            console.log(`⏭️  Skipping existing index: ${indexOp.name}`);
            skippedCount++;
            continue;
          }
          
          console.log(`🔨 Creating index: ${indexOp.name}`);
          await collection.createIndex(indexOp.spec, {
            ...indexOp.options,
            name: indexOp.name
          });
          
          console.log(`✅ Created index: ${indexOp.name}`);
          createdCount++;
          
        } catch (error) {
          if (error.code === 85) { // Index already exists
            console.log(`⏭️  Index already exists: ${indexOp.name}`);
            skippedCount++;
          } else {
            console.error(`❌ Failed to create index ${indexOp.name}:`, error.message);
          }
        }
      }
      
      // Create TTL index for automatic data cleanup
      const ttlIndexName = 'lastSnapshotAt_1_ttl';
      try {
        if (existingIndexNames.includes(ttlIndexName)) {
          console.log(`⏭️  TTL index already exists: ${ttlIndexName}`);
          skippedCount++;
        } else {
          console.log(`🕒 Creating TTL index for ${collectionInfo.displayName} (${collectionInfo.ttlSeconds}s retention)...`);
          await collection.createIndex(
            { lastSnapshotAt: 1 },
            {
              background: true,
              expireAfterSeconds: collectionInfo.ttlSeconds,
              name: ttlIndexName
            }
          );
          console.log(`✅ Created TTL index: ${ttlIndexName}`);
          createdCount++;
        }
      } catch (error) {
        if (error.code === 85) {
          console.log(`⏭️  TTL index already exists: ${ttlIndexName}`);
          skippedCount++;
        } else {
          console.error(`❌ Failed to create TTL index ${ttlIndexName}:`, error.message);
        }
      }
      
      console.log(`📊 ${collectionInfo.displayName} summary: ✅ ${createdCount} created, ⏭️ ${skippedCount} skipped`);
      totalCreated += createdCount;
      totalSkipped += skippedCount;
      
      // Show collection stats
      try {
        const stats = await collection.stats();
        console.log(`📏 ${collectionInfo.displayName} size: ${(stats.size / 1024).toFixed(2)} KB, Documents: ${stats.count}`);
        
        if (stats.indexSizes) {
          const totalIndexSize = Object.values(stats.indexSizes).reduce((sum, size) => sum + size, 0);
          console.log(`🗂️  Total index size: ${(totalIndexSize / 1024).toFixed(2)} KB`);
        }
      } catch (statsError) {
        console.log(`⚠️  Could not retrieve stats for ${collectionInfo.displayName}`);
      }
    }
    
    console.log(`\n🎉 Stats collections index creation completed!`);
    console.log(`📈 Overall summary:`);
    console.log(`   ✅ Total created: ${totalCreated} indexes`);
    console.log(`   ⏭️  Total skipped: ${totalSkipped} indexes (already exist)`);
    console.log(`   📊 Total processed: ${totalCreated + totalSkipped} indexes`);
    
    console.log(`\n🕒 TTL (Time To Live) retention policies:`);
    statsCollections.forEach(col => {
      const days = Math.round(col.ttlSeconds / (24 * 60 * 60));
      console.log(`   ${col.displayName}: ${days} days`);
    });
    
  } catch (error) {
    console.error('❌ Error creating Stats indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if called directly
if (require.main === module) {
  createStatsIndexes()
    .then(() => {
      console.log('✅ Stats index migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Stats index migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createStatsIndexes };