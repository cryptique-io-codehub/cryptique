/**
 * Migration script to update the transactions collection
 * Run this with: node scripts/migration.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptique-dev';
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    
    // Get the database and collection
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');
    
    console.log('Starting migration...');
    
    // Step 1: List and drop any problematic indexes
    console.log('Step 1: Checking for problematic indexes...');
    const indexes = await transactionsCollection.indexes();
    
    // Find the unique index on tx_hash
    const txHashUniqueIndex = indexes.find(idx => 
      (idx.name === 'tx_hash_1' || (idx.key && idx.key.tx_hash)) && 
      idx.unique === true
    );
    
    if (txHashUniqueIndex) {
      console.log(`Found unique index on tx_hash: ${txHashUniqueIndex.name}. Dropping...`);
      await transactionsCollection.dropIndex(txHashUniqueIndex.name);
      console.log(`Index ${txHashUniqueIndex.name} dropped successfully.`);
    } else {
      console.log('No unique index found on tx_hash.');
    }
    
    // Find any non-unique index on tx_hash and drop it too (we'll recreate without uniqueness)
    const txHashIndex = indexes.find(idx => 
      (idx.name === 'tx_hash_1' || (idx.key && idx.key.tx_hash === 1)) && 
      !idx.unique
    );
    
    if (txHashIndex) {
      console.log(`Found index on tx_hash: ${txHashIndex.name}. Dropping to recreate...`);
      await transactionsCollection.dropIndex(txHashIndex.name);
      console.log(`Index ${txHashIndex.name} dropped successfully.`);
    }
    
    // Find any compound index with contractId + tx_hash
    const compoundIndex = indexes.find(idx => 
      idx.key && 
      idx.key.contractId === 1 && 
      idx.key.tx_hash === 1
    );
    
    if (compoundIndex) {
      console.log(`Found compound index on contractId+tx_hash: ${compoundIndex.name}. Dropping...`);
      await transactionsCollection.dropIndex(compoundIndex.name);
      console.log(`Index ${compoundIndex.name} dropped successfully.`);
    }
    
    // Step 2: Create recommended non-unique indexes
    console.log('\nStep 2: Creating recommended indexes...');
    
    // Create non-unique index on contractId and tx_hash separately
    await transactionsCollection.createIndex({ contractId: 1 }, { background: true });
    console.log('Created index on contractId');
    
    // Create compound index for efficient queries
    await transactionsCollection.createIndex({ contractId: 1, block_number: -1 }, { background: true });
    console.log('Created compound index on contractId + block_number');
    
    await transactionsCollection.createIndex({ contractId: 1, block_time: -1 }, { background: true });
    console.log('Created compound index on contractId + block_time');
    
    // Step 3: Verify indexes
    console.log('\nStep 3: Verifying indexes...');
    const updatedIndexes = await transactionsCollection.indexes();
    console.log('Current indexes:');
    updatedIndexes.forEach(idx => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

connectDB(); 