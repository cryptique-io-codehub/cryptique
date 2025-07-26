/**
 * Script to add performance indexes for analytics queries
 * Run this script to optimize database performance for analytics operations
 */

const mongoose = require('mongoose');
require('dotenv').config();

const addAnalyticsIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Add indexes for Session collection
    console.log('Adding indexes to Session collection...');
    
    const sessionIndexes = [
      { siteId: 1, startTime: -1 },
      { siteId: 1, isWeb3User: 1, startTime: -1 },
      { siteId: 1, country: 1, startTime: -1 },
      { siteId: 1, 'utmData.source': 1, startTime: -1 },
      { siteId: 1, referrer: 1, startTime: -1 },
      { userId: 1, siteId: 1, startTime: -1 }
    ];

    for (const indexSpec of sessionIndexes) {
      try {
        await db.collection('sessions').createIndex(indexSpec);
        console.log(`✓ Created index: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(indexSpec)}`);
        } else {
          console.error(`✗ Error creating index ${JSON.stringify(indexSpec)}:`, error.message);
        }
      }
    }

    // Add indexes for Analytics collection
    console.log('\nAdding indexes to Analytics collection...');
    
    const analyticsIndexes = [
      { siteId: 1 },
      { siteId: 1, 'sessions': 1 }
    ];

    for (const indexSpec of analyticsIndexes) {
      try {
        await db.collection('analytics').createIndex(indexSpec);
        console.log(`✓ Created index: ${JSON.stringify(indexSpec)}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`- Index already exists: ${JSON.stringify(indexSpec)}`);
        } else {
          console.error(`✗ Error creating index ${JSON.stringify(indexSpec)}:`, error.message);
        }
      }
    }

    // Add indexes for Stats collections
    console.log('\nAdding indexes to Stats collections...');
    
    const statsCollections = ['hourlystats', 'dailystats', 'weeklystats', 'monthlystats'];
    const statsIndexes = [
      { siteId: 1 },
      { siteId: 1, lastSnapshotAt: -1 }
    ];

    for (const collection of statsCollections) {
      console.log(`\nProcessing ${collection}...`);
      for (const indexSpec of statsIndexes) {
        try {
          await db.collection(collection).createIndex(indexSpec);
          console.log(`✓ Created index on ${collection}: ${JSON.stringify(indexSpec)}`);
        } catch (error) {
          if (error.code === 85) {
            console.log(`- Index already exists on ${collection}: ${JSON.stringify(indexSpec)}`);
          } else {
            console.error(`✗ Error creating index on ${collection} ${JSON.stringify(indexSpec)}:`, error.message);
          }
        }
      }
    }

    console.log('\n🎉 Analytics indexes setup completed!');
    console.log('\nPerformance improvements:');
    console.log('- Session queries by siteId and date range will be much faster');
    console.log('- Web3 user analytics will use optimized indexes');
    console.log('- Geographic and traffic source analytics will be accelerated');
    console.log('- Stats collection queries will be optimized');

  } catch (error) {
    console.error('Error setting up indexes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  addAnalyticsIndexes();
}

module.exports = addAnalyticsIndexes;