/**
 * Migration script to fix transaction index issue
 * 
 * This script:
 * 1. Drops the existing unique index on tx_hash
 * 2. Creates a new composite index on contractId+tx_hash
 * 
 * Run with: node fix-transaction-index.js "mongodb+srv://your-connection-string"
 */

const mongoose = require('mongoose');

// Get MongoDB URI from command line argument or .env file
let MONGODB_URI = process.argv[2];

// If no command line argument, try loading from .env
if (!MONGODB_URI) {
  try {
    require('dotenv').config();
    MONGODB_URI = process.env.MONGODB_URI;
  } catch (err) {
    console.error('Error loading .env file:', err.message);
  }
}

// If still no URI, display help message
if (!MONGODB_URI) {
  console.error('MongoDB URI not provided!');
  console.error('Please run the script with your MongoDB connection string:');
  console.error('node fix-transaction-index.js "mongodb+srv://your-connection-string"');
  console.error('Or create a .env file with MONGODB_URI=your-connection-string');
  process.exit(1);
}

async function fixTransactionIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB.');
    
    // Get direct access to the transactions collection
    const db = mongoose.connection.db;
    const transactionsCollection = db.collection('transactions');
    
    // List existing indexes
    console.log('Current indexes:');
    const indexes = await transactionsCollection.indexes();
    console.log(indexes);
    
    // Check if the unique tx_hash index exists
    const txHashUniqueIndex = indexes.find(index => 
      index.name === 'tx_hash_1' && index.unique === true
    );
    
    if (txHashUniqueIndex) {
      console.log('Found unique index on tx_hash. Dropping index...');
      await transactionsCollection.dropIndex('tx_hash_1');
      console.log('Unique index on tx_hash dropped successfully.');
    } else {
      console.log('No unique index found on tx_hash field.');
    }
    
    // Create a new non-unique index on tx_hash if it doesn't exist
    console.log('Creating non-unique index on tx_hash...');
    await transactionsCollection.createIndex({ tx_hash: 1 }, { 
      name: 'tx_hash_1',
      unique: false
    });
    console.log('Non-unique index on tx_hash created successfully.');
    
    // Create a unique composite index on contractId + tx_hash
    console.log('Creating unique composite index on contractId + tx_hash...');
    await transactionsCollection.createIndex(
      { contractId: 1, tx_hash: 1 }, 
      { unique: true, name: 'contractId_tx_hash_1' }
    );
    console.log('Unique composite index on contractId + tx_hash created successfully.');
    
    // Verify the new indexes
    console.log('Updated indexes:');
    const updatedIndexes = await transactionsCollection.indexes();
    console.log(updatedIndexes);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB.');
    } catch (err) {
      // Ignore disconnect errors
    }
  }
}

fixTransactionIndexes(); 