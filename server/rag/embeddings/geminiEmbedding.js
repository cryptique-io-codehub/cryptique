const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiEmbeddingService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
    this.embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });
  }

  async generateEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input for embedding generation');
      }

      // Clean and prepare the text
      const cleanedText = text.trim().replace(/\s+/g, ' ');
      
      // Generate embedding
      const result = await this.embeddingModel.embedContent(cleanedText);
      const embedding = result.embedding.values;

      return embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  async generateBatchEmbeddings(texts) {
    try {
      if (!Array.isArray(texts)) {
        throw new Error('Input must be an array of texts');
      }

      // Process texts in parallel with rate limiting
      const batchSize = 5; // Process 5 texts at a time
      const embeddings = [];
      
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => this.generateEmbedding(text));
        
        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises);
        embeddings.push(...batchResults);
        
        // Add a small delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Error in batch embedding generation:', error);
      throw error;
    }
  }

  // Helper method to generate embeddings for chunks
  async embedChunks(chunks) {
    try {
      const texts = chunks.map(chunk => chunk.text);
      const embeddings = await this.generateBatchEmbeddings(texts);

      // Combine chunks with their embeddings
      return chunks.map((chunk, index) => ({
        ...chunk,
        vector: embeddings[index]
      }));
    } catch (error) {
      console.error('Error embedding chunks:', error);
      throw error;
    }
  }
}

module.exports = new GeminiEmbeddingService(); 