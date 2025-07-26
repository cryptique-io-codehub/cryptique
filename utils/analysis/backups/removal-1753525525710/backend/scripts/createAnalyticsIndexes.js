/**
 * Database migration script to create optimized indexes for Analytics collection
 * This script ensures all performance-critical indexes are created for existing databases
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectToDatabase } = require('../config/database');

async function createAnalyticsIndexes() {
  try {
    console.log('🚀 Starting Analytics collection index creation...');
    console.log('🔍 MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    // Connect to MongoDB using existing config
    await connectToDatabase();
    
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const analyticsCollection = db.collection('analytics');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'analytics' }).toArray();
    if (collections.length === 0) {
      console.log('⚠️  Analytics collection does not exist yet. Indexes will be created when first document is inserted.');
      return;
    }
    
    console.log('📊 Creating performance indexes for Analytics collection...');
    
    // Create indexes with performance monitoring
    const indexOperations = [
      // Primary siteId index (may already exist)
      {
        name: 'siteId_1',
        spec: { siteId: 1 },
        options: { background: true }
      },
      
      // Compound index for session lookups
      {
        name: 'siteId_1_sessions_1',
        spec: { siteId: 1, sessions: 1 },
        options: { background: true }
      },
      
      // User journey indexes
      {
        name: 'userJourneys.userId_1_siteId_1',
        spec: { 'userJourneys.userId': 1, siteId: 1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_userJourneys.firstVisit_-1',
        spec: { siteId: 1, 'userJourneys.firstVisit': -1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_userJourneys.lastVisit_-1',
        spec: { siteId: 1, 'userJourneys.lastVisit': -1 },
        options: { background: true }
      },
      
      // Conversion analysis indexes
      {
        name: 'siteId_1_userJourneys.hasConverted_1',
        spec: { siteId: 1, 'userJourneys.hasConverted': 1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_userJourneys.userSegment_1',
        spec: { siteId: 1, 'userJourneys.userSegment': 1 },
        options: { background: true }
      },
      
      // Wallet-related indexes
      {
        name: 'siteId_1_walletsConnected_1',
        spec: { siteId: 1, walletsConnected: 1 },
        options: { background: true }
      },
      
      {
        name: 'siteId_1_wallets.walletAddress_1',
        spec: { siteId: 1, 'wallets.walletAddress': 1 },
        options: { background: true, sparse: true }
      },
      
      // Traffic source analysis
      {
        name: 'siteId_1_conversionPaths.sourceMedium_1',
        spec: { siteId: 1, 'conversionPaths.sourceMedium': 1 },
        options: { background: true }
      },
      
      // Page analytics
      {
        name: 'siteId_1_totalPageViews_-1',
        spec: { siteId: 1, totalPageViews: -1 },
        options: { background: true }
      }
    ];
    
    // Get existing indexes
    const existingIndexes = await analyticsCollection.indexes();
    const existingIndexNames = existingIndexes.map(idx => idx.name);
    
    console.log(`📋 Found ${existingIndexes.length} existing indexes:`, existingIndexNames);
    
    // Create indexes that don't already exist
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const indexOp of indexOperations) {
      try {
        if (existingIndexNames.includes(indexOp.name)) {
          console.log(`⏭️  Skipping existing index: ${indexOp.name}`);
          skippedCount++;
          continue;
        }
        
        console.log(`🔨 Creating index: ${indexOp.name}`);
        await analyticsCollection.createIndex(indexOp.spec, {
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
    
    console.log(`\n📈 Index creation summary:`);
    console.log(`   ✅ Created: ${createdCount} indexes`);
    console.log(`   ⏭️  Skipped: ${skippedCount} indexes (already exist)`);
    console.log(`   📊 Total: ${createdCount + skippedCount} indexes processed`);
    
    // Verify all indexes were created
    const finalIndexes = await analyticsCollection.indexes();
    console.log(`\n🔍 Final index count: ${finalIndexes.length}`);
    
    // Show index sizes for monitoring
    const stats = await analyticsCollection.stats();
    if (stats.indexSizes) {
      console.log('\n📏 Index sizes:');
      Object.entries(stats.indexSizes).forEach(([name, size]) => {
        console.log(`   ${name}: ${(size / 1024).toFixed(2)} KB`);
      });
    }
    
    console.log('\n🎉 Analytics index creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating Analytics indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if called directly
if (require.main === module) {
  createAnalyticsIndexes()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createAnalyticsIndexes };