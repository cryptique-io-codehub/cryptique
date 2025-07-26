/**
 * Database Connection Helper Utilities
 * Centralized database connection management and configuration
 */

const mongoose = require('mongoose');

// Default connection options for security and performance
const defaultConnectionOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  
  // Security settings
  ssl: process.env.NODE_ENV === 'production',
  tlsAllowInvalidCertificates: false,
  
  // Authentication timeout settings
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  
  // Connection pool settings
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
  
  // Write concern settings
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 5000
  },
  
  // Read concern settings
  readConcern: {
    level: 'majority'
  },
  
  // Retry settings
  serverSelectionTimeoutMS: 15000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true
};

/**
 * Connect to MongoDB with secure configuration and retry logic
 * @param {string} uri - MongoDB connection URI
 * @param {Object} options - Additional connection options
 * @param {number} retryCount - Current retry attempt
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise} Mongoose connection promise
 */
const connectToDatabase = async (uri = null, options = {}, retryCount = 0, maxRetries = 5) => {
  const MONGODB_URI = uri || process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // Merge default options with provided options
  const connectionOptions = {
    ...defaultConnectionOptions,
    ...options
  };

  try {
    const connection = await mongoose.connect(MONGODB_URI, connectionOptions);
    
    console.log(`MongoDB connected successfully to ${connection.connection.host}`);
    setupConnectionEventListeners();
    
    return connection;
  } catch (error) {
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000;
      console.log(`MongoDB connection attempt ${retryCount + 1} failed. Retrying in ${retryDelay}ms...`);
      console.error('Connection error:', error.message);
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectToDatabase(uri, options, retryCount + 1, maxRetries);
    } else {
      console.error('MongoDB connection failed after maximum retries:', error);
      throw error;
    }
  }
};

/**
 * Set up connection event listeners for monitoring
 */
const setupConnectionEventListeners = () => {
  const db = mongoose.connection;
  
  db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  
  db.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  
  db.on('reconnected', () => {
    console.info('MongoDB reconnected successfully');
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    } catch (error) {
      console.error('Error closing MongoDB connection:', error);
      process.exit(1);
    }
  });
};

/**
 * Check if database is connected
 * @returns {boolean} Connection status
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Get connection status information
 * @returns {Object} Connection status details
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[mongoose.connection.readyState],
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

/**
 * Close database connection
 * @returns {Promise} Close connection promise
 */
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed successfully');
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectToDatabase,
  setupConnectionEventListeners,
  isConnected,
  getConnectionStatus,
  closeConnection,
  defaultConnectionOptions
};