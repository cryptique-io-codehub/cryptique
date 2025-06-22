const { GoogleGenerativeAI } = require('@google/generative-ai');

class VectorService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY not found. Vector operations will be disabled.');
        return;
      }
      this.isInitialized = true;
      console.log('Vector service initialized with Gemini API');
    } catch (error) {
      console.error('Failed to initialize vector service:', error);
    }
  }

  /**
   * Generate embeddings for text content
   * @param {string} text - Text to generate embeddings for
   * @returns {Promise<number[]>} - Array of embedding values
   */
  async generateEmbedding(text) {
    if (!this.isInitialized) {
      console.warn('Vector service not initialized. Skipping embedding generation.');
      return null;
    }

    try {
      // Clean and prepare text
      const cleanText = this.preprocessText(text);
      
      if (!cleanText || cleanText.length < 10) {
        console.warn('Text too short for embedding generation');
        return null;
      }

      // Generate embedding using Gemini
      const result = await this.model.embedContent(cleanText);
      const embedding = result.embedding;
      
      if (!embedding || !embedding.values || embedding.values.length === 0) {
        console.warn('No embedding values returned from Gemini API');
        return null;
      }

      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {string[]} texts - Array of texts to generate embeddings for
   * @returns {Promise<number[][]>} - Array of embedding arrays
   */
  async generateBatchEmbeddings(texts) {
    if (!this.isInitialized) {
      console.warn('Vector service not initialized. Skipping batch embedding generation.');
      return [];
    }

    const embeddings = [];
    const batchSize = 10; // Process in batches to avoid rate limits

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(text => this.generateEmbedding(text));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        const batchEmbeddings = batchResults.map(result => 
          result.status === 'fulfilled' ? result.value : null
        );
        
        embeddings.push(...batchEmbeddings);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await this.delay(100); // 100ms delay
        }
      } catch (error) {
        console.error('Error in batch embedding generation:', error);
        // Add null values for failed batch
        embeddings.push(...new Array(batch.length).fill(null));
      }
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vectorA - First vector
   * @param {number[]} vectorB - Second vector
   * @returns {number} - Cosine similarity score (-1 to 1)
   */
  calculateCosineSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find similar vectors using cosine similarity
   * @param {number[]} queryVector - Vector to search for
   * @param {Array<{id: string, vector: number[], metadata: object}>} vectorDatabase - Database of vectors
   * @param {number} topK - Number of top results to return
   * @param {number} threshold - Minimum similarity threshold
   * @returns {Array<{id: string, similarity: number, metadata: object}>} - Similar vectors with scores
   */
  findSimilarVectors(queryVector, vectorDatabase, topK = 10, threshold = 0.7) {
    if (!queryVector || !vectorDatabase || vectorDatabase.length === 0) {
      return [];
    }

    const similarities = vectorDatabase.map(item => ({
      id: item.id,
      similarity: this.calculateCosineSimilarity(queryVector, item.vector),
      metadata: item.metadata
    }));

    // Filter by threshold and sort by similarity
    return similarities
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Preprocess text for embedding generation
   * @param {string} text - Raw text
   * @returns {string} - Cleaned text
   */
  preprocessText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?]/g, '') // Remove special characters except basic punctuation
      .substring(0, 8000); // Limit length for API
  }

  /**
   * Update document with vector embedding
   * @param {object} document - Mongoose document
   * @param {string} textField - Field name containing text content
   * @returns {Promise<boolean>} - Success status
   */
  async updateDocumentVector(document, textField = 'textContent') {
    try {
      const text = document[textField];
      if (!text) {
        console.warn('No text content found for vector generation');
        return false;
      }

      const embedding = await this.generateEmbedding(text);
      if (!embedding) {
        return false;
      }

      document.contentVector = embedding;
      await document.save();
      
      return true;
    } catch (error) {
      console.error('Error updating document vector:', error);
      return false;
    }
  }

  /**
   * Batch update documents with vector embeddings
   * @param {Array} documents - Array of Mongoose documents
   * @param {string} textField - Field name containing text content
   * @returns {Promise<{success: number, failed: number}>} - Update statistics
   */
  async batchUpdateDocumentVectors(documents, textField = 'textContent') {
    let success = 0;
    let failed = 0;

    for (const document of documents) {
      try {
        const updated = await this.updateDocumentVector(document, textField);
        if (updated) {
          success++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('Error updating document vector:', error);
        failed++;
      }

      // Add small delay to avoid overwhelming the API
      await this.delay(50);
    }

    return { success, failed };
  }

  /**
   * Utility function to add delay
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get vector service status
   * @returns {object} - Service status information
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasApiKey: !!process.env.GEMINI_API_KEY,
      model: "text-embedding-004",
      provider: "Google Gemini"
    };
  }
}

// Export singleton instance
const vectorService = new VectorService();
module.exports = vectorService; 