/**
 * Script to drop unique indexes from the transactions collection
 * Run this script with: node scripts/dropIndexes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const util = require('util');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/cryptique-dev';
    console.log(`Connecting to MongoDB at ${mongoURI}...`);
    
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
    
    // Get the transactions collection
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');
    
    // List all indexes
    console.log('Current indexes on transactions collection:');
    const indexes = await transactionsCollection.indexes();
    console.log(util.inspect(indexes, { depth: null, colors: true }));
    
    // Drop the tx_hash index if it exists
    const txHashIndex = indexes.find(idx => 
      idx.name === 'tx_hash_1' || 
      (idx.key && idx.key.tx_hash !== undefined)
    );
    
    if (txHashIndex) {
      console.log(`Found tx_hash index: ${txHashIndex.name}. Dropping...`);
      await transactionsCollection.dropIndex(txHashIndex.name);
      console.log(`Successfully dropped index ${txHashIndex.name}`);
    } else {
      console.log('No tx_hash index found');
    }
    
    // Also look for and drop any compound index with tx_hash
    const compoundIndexes = indexes.filter(idx => 
      idx.key && 
      Object.keys(idx.key).includes('tx_hash') && 
      Object.keys(idx.key).length > 1
    );
    
    if (compoundIndexes.length > 0) {
      console.log(`Found ${compoundIndexes.length} compound indexes with tx_hash`);
      
      for (const idx of compoundIndexes) {
        console.log(`Dropping compound index: ${idx.name}`);
        await transactionsCollection.dropIndex(idx.name);
        console.log(`Successfully dropped compound index ${idx.name}`);
      }
    } else {
      console.log('No compound indexes with tx_hash found');
    }
    
    // List indexes after dropping
    console.log('\nRemaining indexes on transactions collection:');
    const remainingIndexes = await transactionsCollection.indexes();
    console.log(util.inspect(remainingIndexes, { depth: null, colors: true }));
    
    console.log('\nIndex cleanup complete!');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

connectDB(); 