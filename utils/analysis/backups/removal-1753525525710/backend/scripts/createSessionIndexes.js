/**
 * Database migration script to create optimized indexes for Session collection
 * This script ensures all performance-critical indexes are created for existing databases
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectToDatabase } = require('../config/database');

async function createSessionIndexes() {
  try {
    console.log('🚀 Starting Session collection index creation...');
    console.log('🔍 MongoDB URI exists:', !!process.env.MONGODB_URI);
    
    // Connect to MongoDB using existing config
    await connectToDatabase();
    
    const db = mongoose.connection.db;
    const sessionCollection = db.collection('sessions');
    
    // Check if collection exists
    const collections = await db.listCollections({ name: 'sessions' }).toArray();
    if (collections.length === 0) {
      console.log('⚠️  Sessions collection does not exist yet. Indexes will be created when first document is inserted.');
      return;
    }
    
    console.log('📊 Creating performance indexes for Sessions collection...');
    
    // Define all indexes to be created
    const indexOperations = [
      // Existing unique compound index
      {
        name: 'sessionId_1_userId_1',
        spec: { sessionId: 1, userId: 1 },
        options: { background: true, unique: true }
      },
      
      // Time-based queries by site
      {
        name: 'siteId_1_startTime_-1',
        spec: { siteId: 1, startTime: -1 },
        options: { background: true }
      },
      
      // User session queries (most common pattern)
      {
        name: 'userId_1_siteId_1_startTime_-1',
        spec: { userId: 1, siteId: 1, startTime: -1 },
        options: { background: true }
      },
      
      // Web3 user queries (sparse for efficiency)
      {
        name: 'siteId_1_wallet.walletAddress_1',
        spec: { siteId: 1, 'wallet.walletAddress': 1 },
        options: { background: true, sparse: true }
      },
      
      // Web3 analytics filtering
      {
        name: 'siteId_1_isWeb3User_1',
        spec: { siteId: 1, isWeb3User: 1 },
        options: { background: true }
      },
      
      // Bounce rate analysis
      {
        name: 'siteId_1_isBounce_1',
        spec: { siteId: 1, isBounce: 1 },
        options: { background: true }
      },
      
      // Session duration analysis
      {
        name: 'siteId_1_duration_-1',
        spec: { siteId: 1, duration: -1 },
        options: { background: true }
      },
      
      // Traffic source analysis
      {
        name: 'siteId_1_utmData.source_1',
        spec: { siteId: 1, 'utmData.source': 1 },
        options: { background: true, sparse: true }
      },
      
      {
        name: 'siteId_1_utmData.campaign_1',
        spec: { siteId: 1, 'utmData.campaign': 1 },
        options: { background: true, sparse: true }
      },
      
      // Referrer analysis
      {
        name: 'siteId_1_referrer_1',
        spec: { siteId: 1, referrer: 1 },
        options: { background: true, sparse: true }
      },
      
      // Device analytics
      {
        name: 'siteId_1_device.type_1',
        spec: { siteId: 1, 'device.type': 1 },
        options: { background: true, sparse: true }
      },
      
      // Browser analytics
      {
        name: 'siteId_1_browser.name_1',
        spec: { siteId: 1, 'browser.name': 1 },
        options: { background: true, sparse: true }
      },
      
      // Geographic analytics
      {
        name: 'siteId_1_country_1',
        spec: { siteId: 1, country: 1 },
        options: { background: true, sparse: true }
      },
      
      // Page analytics
      {
        name: 'siteId_1_entryPage_1',
        spec: { siteId: 1, entryPage: 1 },
        options: { background: true, sparse: true }
      },
      
      {
        name: 'siteId_1_exitPage_1',
        spec: { siteId: 1, exitPage: 1 },
        options: { background: true, sparse: true }
      },
      
      // User journey analysis
      {
        name: 'userId_1_sessionNumber_1',
        spec: { userId: 1, sessionNumber: 1 },
        options: { background: true }
      },
      
      {
        name: 'previousSessionId_1',
        spec: { previousSessionId: 1 },
        options: { background: true, sparse: true }
      }
    ];
    
    // Get existing indexes
    const existingIndexes = await sessionCollection.indexes();
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
        await sessionCollection.createIndex(indexOp.spec, {
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
    
    console.log(`\n📈 Session index creation summary:`);
    console.log(`   ✅ Created: ${createdCount} indexes`);
    console.log(`   ⏭️  Skipped: ${skippedCount} indexes (already exist)`);
    console.log(`   📊 Total: ${createdCount + skippedCount} indexes processed`);
    
    // Verify all indexes were created
    const finalIndexes = await sessionCollection.indexes();
    console.log(`\n🔍 Final index count: ${finalIndexes.length}`);
    
    // Show index sizes for monitoring
    const stats = await sessionCollection.stats();
    if (stats.indexSizes) {
      console.log('\n📏 Index sizes:');
      Object.entries(stats.indexSizes).forEach(([name, size]) => {
        console.log(`   ${name}: ${(size / 1024).toFixed(2)} KB`);
      });
    }
    
    console.log('\n🎉 Session index creation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating Session indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if called directly
if (require.main === module) {
  createSessionIndexes()
    .then(() => {
      console.log('✅ Session index migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Session index migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createSessionIndexes };