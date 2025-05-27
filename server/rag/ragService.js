const analyticsTransformer = require('./transformers/analyticsTransformer');
const analyticsChunker = require('./chunkers/analyticsChunker');
const geminiEmbedding = require('./embeddings/geminiEmbedding');
const mongoVectorStore = require('./vectorstore/mongoVectorStore');

class RAGService {
  constructor() {
    this.transformer = analyticsTransformer;
    this.chunker = analyticsChunker;
    this.embedding = geminiEmbedding;
    this.vectorStore = mongoVectorStore;
  }

  async processWebsiteAnalytics(analytics, metadata) {
    try {
      // Transform analytics to natural language
      const transformedData = this.transformer.transformWebsiteAnalytics(analytics);
      if (!transformedData) {
        throw new Error('Failed to transform website analytics');
      }

      // Create chunks with metadata
      const chunks = this.chunker.chunkWebsiteAnalytics(transformedData, metadata);
      if (chunks.length === 0) {
        throw new Error('No chunks generated from website analytics');
      }

      // Generate embeddings for chunks
      const vectorizedChunks = await this.embedding.embedChunks(chunks);
      if (!vectorizedChunks || vectorizedChunks.length === 0) {
        throw new Error('Failed to generate embeddings for chunks');
      }

      // Store vectors in MongoDB
      await this.vectorStore.storeVectors(vectorizedChunks);

      return vectorizedChunks;
    } catch (error) {
      console.error('Error processing website analytics:', error);
      throw error;
    }
  }

  async processContractAnalytics(contractData, metadata) {
    try {
      // Transform contract data to natural language
      const transformedData = this.transformer.transformContractAnalytics(contractData);
      if (!transformedData) {
        throw new Error('Failed to transform contract analytics');
      }

      // Create chunks with metadata
      const chunks = this.chunker.chunkContractAnalytics(transformedData, metadata);
      if (chunks.length === 0) {
        throw new Error('No chunks generated from contract analytics');
      }

      // Generate embeddings for chunks
      const vectorizedChunks = await this.embedding.embedChunks(chunks);
      if (!vectorizedChunks || vectorizedChunks.length === 0) {
        throw new Error('Failed to generate embeddings for chunks');
      }

      // Store vectors in MongoDB
      await this.vectorStore.storeVectors(vectorizedChunks);

      return vectorizedChunks;
    } catch (error) {
      console.error('Error processing contract analytics:', error);
      throw error;
    }
  }

  async queryAnalytics(query, context) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embedding.generateEmbedding(query);
      if (!queryEmbedding) {
        throw new Error('Failed to generate query embedding');
      }

      // Prepare search filter based on context
      const filter = {
        siteIds: Array.from(context.selectedSites || []),
        contractIds: Array.from(context.selectedContracts || []),
        timeRange: context.timeRange,
        dataCategory: context.metricFocus
      };

      // Find similar vectors
      const similarVectors = await this.vectorStore.findSimilarVectors(
        queryEmbedding,
        filter,
        5 // Get top 5 most relevant chunks
      );

      return {
        query,
        context: similarVectors.map(v => ({
          text: v.text,
          metadata: v.metadata,
          relevanceScore: v.score
        }))
      };
    } catch (error) {
      console.error('Error querying analytics:', error);
      throw error;
    }
  }

  async processAnalyticsBatch(websiteAnalytics = [], contractAnalytics = []) {
    try {
      const websitePromises = websiteAnalytics.map(({ analytics, metadata }) => 
        this.processWebsiteAnalytics(analytics, metadata)
      );

      const contractPromises = contractAnalytics.map(({ analytics, metadata }) => 
        this.processContractAnalytics(analytics, metadata)
      );

      const [websiteResults, contractResults] = await Promise.all([
        Promise.all(websitePromises),
        Promise.all(contractPromises)
      ]);

      return {
        websiteResults: websiteResults.flat(),
        contractResults: contractResults.flat()
      };
    } catch (error) {
      console.error('Error processing analytics batch:', error);
      throw error;
    }
  }

  // Maintenance method to clean up old vectors
  async cleanupOldVectors(daysToKeep = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      await this.vectorStore.deleteOldVectors(cutoffDate);
    } catch (error) {
      console.error('Error cleaning up old vectors:', error);
      throw error;
    }
  }
}

module.exports = new RAGService(); 