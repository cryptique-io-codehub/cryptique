const mongoose = require('mongoose');
require('dotenv').config();
const { connectToDatabase } = require('../config/database');

async function dropIndices() {
  console.log('Connecting to database to drop unique indices...');
  
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    console.log('MongoDB connection established successfully');
    
    // Get a reference to the transactions collection
    const db = mongoose.connection.db;
    const collection = db.collection('transactions');
    
    // First, retrieve all indices
    const indices = await collection.indexes();
    console.log('Current indices:', JSON.stringify(indices, null, 2));
    
    // Identify unique indices to drop
    for (const index of indices) {
      // If this is a unique index
      if (index.unique === true) {
        console.log(`Found unique index to drop: ${index.name}`);
        
        try {
          await collection.dropIndex(index.name);
          console.log(`Successfully dropped index: ${index.name}`);
        } catch (dropError) {
          console.error(`Error dropping index ${index.name}:`, dropError);
        }
      }
      
      // Also specifically check for tx_hash_1 index
      if (index.name === 'tx_hash_1') {
        console.log('Found tx_hash_1 index to drop');
        
        try {
          await collection.dropIndex('tx_hash_1');
          console.log('Successfully dropped tx_hash_1 index');
        } catch (dropError) {
          console.error('Error dropping tx_hash_1 index:', dropError);
        }
      }
    }
    
    // Recreate non-unique indices for tx_hash
    console.log('Creating new non-unique index for contractId and tx_hash...');
    await collection.createIndex({ contractId: 1, tx_hash: 1 });
    console.log('Successfully created non-unique index');
    
    // Verify final indices
    const finalIndices = await collection.indexes();
    console.log('Final indices:', JSON.stringify(finalIndices, null, 2));
    
    console.log('Index cleanup complete!');
  } catch (error) {
    console.error('Error during index operation:', error);
  } finally {
    console.log('Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log('Connection closed, exiting');
    process.exit(0);
  }
}

// Run the function
dropIndices(); 