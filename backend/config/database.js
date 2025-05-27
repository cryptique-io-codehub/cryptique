/**
 * Secure MongoDB connection configuration 
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Default connection options for security and performance
const defaultConnectionOptions = {
  useNewUrlParser: true,    // Use new URL parser to avoid deprecation warnings
  useUnifiedTopology: true, // Use new server discovery and monitoring engine
  
  // Security settings
  ssl: process.env.NODE_ENV === 'production', // Enforce SSL in production
  tlsAllowInvalidCertificates: false,        // Reject invalid certificates
  
  // Authentication timeout settings - prevent slow connection attack vectors
  connectTimeoutMS: 10000,   // 10 seconds to establish connection
  socketTimeoutMS: 45000,    // 45 seconds to complete operations
  
  // Connection pool settings for Vercel serverless environment
  maxPoolSize: process.env.NODE_ENV === 'production' ? 1 : 10, // Use smaller pool in production
  minPoolSize: process.env.NODE_ENV === 'production' ? 0 : 2,  // No minimum in production
  
  // Write concern settings - ensure data integrity
  writeConcern: {
    w: 'majority',           // Wait for write acknowledgement from majority of replicas
    j: true,                 // Wait for write to be committed to journal
    wtimeout: 5000           // Timeout for write concerns in milliseconds
  },
  
  // Read concern settings - ensure data consistency
  readConcern: {
    level: 'majority'        // Read the most recent data acknowledged by majority
  },
  
  // Retry settings - automatic reconnection
  serverSelectionTimeoutMS: 15000,   // How long to try selecting a server
  heartbeatFrequencyMS: 10000,       // How often to check server health
  retryWrites: true,                 // Retry write operations if they fail
  retryReads: true                   // Retry read operations if they fail
};

/**
 * Connects to MongoDB with secure configuration
 * @returns {Promise} Mongoose connection promise
 */
const connectToDatabase = async () => {
  // Check if MongoDB URI is set
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI environment variable is not set');
    throw new Error('MongoDB connection string not found in environment variables');
  }

  try {
    // Apply all security options and connect
    const connection = await mongoose.connect(process.env.MONGODB_URI, defaultConnectionOptions);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      // Don't exit process in production as Vercel will restart
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB reconnected successfully');
    });

    // Log connection success with sanitized host info
    const host = connection.connection.host.replace(/:[^:]*@/, ':****@');
    console.log(`MongoDB connected successfully to ${host}`);
    
    return connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    // In production (Vercel), throw error instead of exiting
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      process.exit(1);
    }
  }
};

module.exports = { connectToDatabase }; 