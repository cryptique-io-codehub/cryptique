const mongoose = require('mongoose');

// MongoDB Connection Configuration
const connectDB = async (retryCount = 0, maxRetries = 5) => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique';
  
  // Connection options with pooling configuration
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // Connection pooling settings
    maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '100', 10),
    minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    serverSelectionTimeoutMS: 30000, // Timeout for server selection
    heartbeatFrequencyMS: 10000, // How often to check connection health
    // High availability settings
    retryWrites: true,
    // If a write operation fails, MongoDB will retry it once
    // These options help with failover in a replica set
    replicaSet: process.env.MONGODB_REPLICA_SET || undefined, // Only set if in production with replica set
    readPreference: process.env.MONGODB_READ_PREFERENCE || 'primaryPreferred'
  };

  // Log connection options in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('MongoDB connection options:', {
      ...options,
      // Don't log any sensitive data that might be in the URI
      uri: MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')
    });
  }

  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('MongoDB connected successfully 🚀');
    setupMongooseEventListeners();
    return mongoose.connection;
  } catch (error) {
    if (retryCount < maxRetries) {
      // Exponential backoff: wait longer between each retry
      const retryDelay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s, 8s, 16s
      console.log(`MongoDB connection attempt ${retryCount + 1} failed. Retrying in ${retryDelay}ms...`);
      console.error('Connection error:', error.message);
      
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDB(retryCount + 1, maxRetries);
    } else {
      console.error('MongoDB connection failed after maximum retries:', error);
      process.exit(1); // Exit with failure
    }
  }
};

// Set up event listeners to handle connection issues during runtime
const setupMongooseEventListeners = () => {
  const db = mongoose.connection;
  
  db.on('error', (err) => {
    console.error('MongoDB connection error:', err);
  });
  
  db.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });
  
  db.on('reconnected', () => {
    console.log('MongoDB reconnected successfully');
  });
  
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed due to app termination');
    process.exit(0);
  });
};

module.exports = connectDB; 