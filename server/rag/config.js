require('dotenv').config();

module.exports = {
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique',
    vectorCollectionName: 'vector_entries',
    // Atlas Vector Search index name
    vectorIndexName: 'vector_index'
  },

  // Gemini API Configuration
  gemini: {
    apiKey: process.env.GEMINI_API,
    embeddingModel: 'embedding-001',
    // Rate limiting settings
    rateLimit: {
      maxRequestsPerMinute: 60,
      batchSize: 5,
      delayBetweenBatches: 1000 // milliseconds
    }
  },

  // Chunking Configuration
  chunking: {
    // Maximum chunk size in characters
    maxChunkSize: 1000,
    // Minimum chunk size in characters
    minChunkSize: 100,
    // Overlap between chunks (percentage)
    overlapPercentage: 10
  },

  // Vector Store Configuration
  vectorStore: {
    // Number of similar vectors to retrieve
    defaultTopK: 5,
    // Minimum similarity score threshold
    minSimilarityScore: 0.7,
    // Vector dimension for Gemini embeddings
    vectorDimension: 768,
    // Data retention period in days
    dataRetentionDays: 7
  },

  // Analytics Processing Configuration
  analytics: {
    // Batch processing settings
    batchSize: 100,
    processingInterval: 5 * 60 * 1000, // 5 minutes
    // Time ranges for analytics aggregation
    timeRanges: {
      realtime: '5m',
      hourly: '1h',
      daily: '1d',
      weekly: '7d'
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    // Enable detailed operation logging
    enableDebug: process.env.NODE_ENV === 'development',
    // Log file paths
    paths: {
      error: './logs/error.log',
      combined: './logs/combined.log'
    }
  }
}; 