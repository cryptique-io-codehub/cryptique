const mongoose = require('mongoose');

// Define the schema for vector entries
const vectorEntrySchema = new mongoose.Schema({
  vector: {
    type: [Number],
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  metadata: {
    type: {
      type: String,
      enum: ['website', 'contract'],
      required: true
    },
    domain: String,
    siteId: String,
    contractId: String,
    contractAddress: String,
    blockchain: String,
    timestamp: Date,
    timeframe: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      required: true
    },
    dataCategory: {
      type: String,
      enum: ['overview', 'user_behavior', 'web3', 'performance', 'user_activity', 'temporal_patterns'],
      required: true
    },
    metrics: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create indexes for efficient querying
vectorEntrySchema.index({ 'metadata.siteId': 1, 'metadata.timestamp': -1 });
vectorEntrySchema.index({ 'metadata.contractId': 1, 'metadata.timestamp': -1 });
vectorEntrySchema.index({ 'metadata.type': 1, 'metadata.dataCategory': 1 });

// Create the model
const VectorEntry = mongoose.model('VectorEntry', vectorEntrySchema);

class MongoVectorStore {
  constructor() {
    this.model = VectorEntry;
  }

  async storeVectors(vectorizedChunks) {
    try {
      if (!Array.isArray(vectorizedChunks)) {
        throw new Error('Input must be an array of vectorized chunks');
      }

      // Prepare documents for insertion
      const documents = vectorizedChunks.map(chunk => ({
        vector: chunk.vector,
        text: chunk.text,
        metadata: chunk.metadata
      }));

      // Insert documents
      const result = await this.model.insertMany(documents);
      console.log(`Stored ${result.length} vector entries successfully`);
      return result;
    } catch (error) {
      console.error('Error storing vectors:', error);
      throw error;
    }
  }

  async findSimilarVectors(queryVector, filter = {}, limit = 5) {
    try {
      // Construct the aggregation pipeline for vector similarity search
      const pipeline = [
        {
          $search: {
            index: "vector_index", // Make sure to create this index in MongoDB Atlas
            knnBeta: {
              vector: queryVector,
              path: "vector",
              k: limit,
              filter: this._constructSearchFilter(filter)
            }
          }
        },
        {
          $project: {
            text: 1,
            metadata: 1,
            score: { $meta: "searchScore" },
            _id: 0
          }
        }
      ];

      const results = await this.model.aggregate(pipeline);
      return results;
    } catch (error) {
      console.error('Error finding similar vectors:', error);
      throw error;
    }
  }

  _constructSearchFilter(filter) {
    const searchFilter = {};

    // Add type filter
    if (filter.type) {
      searchFilter['metadata.type'] = filter.type;
    }

    // Add site/contract filters
    if (filter.siteIds && filter.siteIds.length > 0) {
      searchFilter['metadata.siteId'] = { $in: filter.siteIds };
    }
    if (filter.contractIds && filter.contractIds.length > 0) {
      searchFilter['metadata.contractId'] = { $in: filter.contractIds };
    }

    // Add time range filter
    if (filter.timeRange) {
      searchFilter['metadata.timestamp'] = {
        $gte: filter.timeRange.start,
        $lte: filter.timeRange.end
      };
    }

    // Add data category filter
    if (filter.dataCategory) {
      searchFilter['metadata.dataCategory'] = filter.dataCategory;
    }

    return searchFilter;
  }

  async deleteOldVectors(olderThan) {
    try {
      const result = await this.model.deleteMany({
        createdAt: { $lt: olderThan }
      });
      console.log(`Deleted ${result.deletedCount} old vector entries`);
      return result;
    } catch (error) {
      console.error('Error deleting old vectors:', error);
      throw error;
    }
  }
}

module.exports = new MongoVectorStore(); 