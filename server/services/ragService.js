const { Pinecone } = require('@pinecone-database/pinecone');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { v4: uuidv4 } = require('uuid');

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
  environment: process.env.PINECONE_ENVIRONMENT || 'gcp-starter',
});

// Initialize Google Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class RAGService {
  constructor() {
    this.index = null;
    this.embeddingModel = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Pinecone index
      this.index = pinecone.Index('cryptique-rag');
      
      // Initialize embedding model
      this.embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' });
      
      console.log('RAG Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RAG Service:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text using Gemini
   */
  async generateEmbeddings(text) {
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }] },
      });
      return result.embedding.values[0];
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error('Failed to generate embeddings');
    }
  }

  /**
   * Retrieve relevant context for a query
   */
  async retrieveContext(query, siteId, options = {}) {
    const {
      limit = 5,
      minScore = 0.6,
      includeMetadata = true,
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddings(query);
      
      // Query Pinecone
      const queryResponse = await this.index.query({
        vector: queryEmbedding,
        topK: limit,
        includeMetadata,
        filter: {
          siteId: { $eq: siteId },
          ...(options.filters || {}),
        },
      });

      // Filter results by minimum score
      const relevantMatches = queryResponse.matches
        .filter(match => match.score >= minScore)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata,
        }));

      // Extract context from matches
      const context = relevantMatches
        .map(match => match.metadata.text)
        .join('\n\n');

      // Extract sources for attribution
      const sources = [...new Set(
        relevantMatches
          .map(match => match.metadata.source)
          .filter(Boolean)
      )];

      return {
        success: true,
        context,
        sources,
        matches: relevantMatches,
        metadata: {
          query,
          siteId,
          matchCount: relevantMatches.length,
          minScore: relevantMatches[relevantMatches.length - 1]?.score || 0,
          maxScore: relevantMatches[0]?.score || 0,
        },
      };
    } catch (error) {
      console.error('Error retrieving context:', error);
      return {
        success: false,
        error: 'Failed to retrieve context',
        details: error.message,
      };
    }
  }

  /**
   * Generate a response using RAG
   */
  async generateResponse(query, siteId, options = {}) {
    const {
      contextLimit = 3,
      maxTokens = 1000,
      temperature = 0.7,
      includeSources = true,
    } = options;

    try {
      // Retrieve relevant context
      const { context, sources, metadata } = await this.retrieveContext(
        query,
        siteId,
        { limit: contextLimit, includeMetadata: true }
      );

      if (!context) {
        return {
          success: false,
          error: 'No relevant context found',
          metadata,
        };
      }

      // Initialize the model
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-pro',
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      // Generate the prompt
      const prompt = `
        You are an AI assistant for Cryptique, a web3 analytics platform.
        
        User Query: "${query}"
        
        Relevant Context:
        ${context}
        
        Instructions:
        1. Provide a clear, concise answer to the user's query.
        2. Only use information from the provided context.
        3. If the context doesn't contain enough information, say so.
        4. Format your response in Markdown.
        
        Response:
      `;

      // Generate the response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        content: text,
        sources: includeSources ? sources : [],
        metadata: {
          ...metadata,
          model: 'gemini-1.5-pro',
          tokensUsed: response.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('Error generating RAG response:', error);
      return {
        success: false,
        error: 'Failed to generate response',
        details: error.message,
      };
    }
  }

  /**
   * Add a document to the knowledge base
   */
  async addDocument(text, metadata = {}) {
    try {
      // Generate embeddings for the document
      const embedding = await this.generateEmbeddings(text);
      
      // Generate a unique ID for the document
      const id = uuidv4();
      
      // Prepare the vector for Pinecone
      const vector = {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          text,
          createdAt: new Date().toISOString(),
        },
      };
      
      // Upsert the vector into Pinecone
      await this.index.upsert([vector]);
      
      return {
        success: true,
        id,
        metadata: vector.metadata,
      };
    } catch (error) {
      console.error('Error adding document:', error);
      return {
        success: false,
        error: 'Failed to add document',
        details: error.message,
      };
    }
  }
}

// Export a singleton instance
module.exports = new RAGService();
