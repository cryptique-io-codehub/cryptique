import axios from 'axios';

/**
 * RAG Service for retrieving relevant context for user queries
 */
class RAGService {
  constructor() {
    this.baseUrl = '/api/rag';
  }

  /**
   * Get relevant context for a user query
   * @param {string} query - User's query
   * @param {string} siteId - Current site ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Relevant context and metadata
   */
  async getRelevantContext(query, siteId, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/retrieve`, {
        query,
        siteId,
        limit: options.limit || 5, // Default to top 5 most relevant chunks
        minScore: options.minScore || 0.6, // Minimum relevance score (0-1)
        includeMetadata: true
      });

      return {
        success: true,
        context: response.data.context,
        sources: response.data.sources || [],
        metadata: response.data.metadata || {}
      };
    } catch (error) {
      console.error('Error retrieving RAG context:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to retrieve relevant context'
      };
    }
  }

  /**
   * Generate a response using RAG-augmented generation
   * @param {string} query - User's query
   * @param {string} siteId - Current site ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Generated response and metadata
   */
  async generateResponse(query, siteId, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/generate`, {
        query,
        siteId,
        contextLimit: options.contextLimit || 3, // Use top 3 most relevant contexts
        maxTokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        includeSources: true
      });

      return {
        success: true,
        content: response.data.content,
        sources: response.data.sources || [],
        metadata: response.data.metadata || {}
      };
    } catch (error) {
      console.error('Error generating RAG response:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to generate response'
      };
    }
  }
}

export default new RAGService();
