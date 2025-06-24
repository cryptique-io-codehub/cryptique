const mongoose = require('mongoose');
const VectorDocument = require('../models/vectorDocument');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');

class DocumentProcessingService {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
    this.batchSize = options.batchSize || 50;
    this.maxConcurrentJobs = options.maxConcurrentJobs || 5;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Processing stats
    this.processingStats = {
      documentsProcessed: 0,
      chunksCreated: 0,
      batchesProcessed: 0,
      totalProcessingTime: 0,
      errors: 0,
      lastProcessedAt: null
    };
    
    // Memory management
    this.memoryUsage = {
      threshold: options.memoryThreshold || 100 * 1024 * 1024, // 100MB
      current: 0,
      peak: 0
    };
  }

  /**
   * Process a single document into chunks with metadata
   * @param {Object} document - Source document with content and metadata
   * @param {string} source - Source identifier (collection name, etc.)
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} Array of processed chunks
   */
  async processDocument(document, source, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!document || !document.content) {
        throw new Error('Document must have content property');
      }
      
      // Extract text content
      const textContent = this.extractTextContent(document);
      if (!textContent || textContent.length === 0) {
        console.warn(`Empty content for document from source: ${source}`);
        return [];
      }
      
      // Create chunks with overlap
      const chunks = this.createTextChunks(textContent, {
        chunkSize: options.chunkSize || this.chunkSize,
        overlap: options.chunkOverlap || this.chunkOverlap
      });
      
      // Process each chunk
      const processedChunks = await Promise.all(
        chunks.map((chunk, index) => this.processChunk(chunk, document, source, index, options))
      );
      
      // Update stats
      this.processingStats.documentsProcessed++;
      this.processingStats.chunksCreated += processedChunks.length;
      this.processingStats.totalProcessingTime += Date.now() - startTime;
      this.processingStats.lastProcessedAt = new Date();
      
      return processedChunks;
      
    } catch (error) {
      this.processingStats.errors++;
      console.error(`Error processing document from ${source}:`, error);
      throw error;
    }
  }

  /**
   * Process multiple documents in batches
   * @param {Array} documents - Array of documents to process
   * @param {string} source - Source identifier
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing results summary
   */
  async processBatch(documents, source, options = {}) {
    const batchStartTime = Date.now();
    const batchSize = options.batchSize || this.batchSize;
    const results = {
      totalDocuments: documents.length,
      processedDocuments: 0,
      totalChunks: 0,
      errors: [],
      processingTime: 0,
      batches: []
    };
    
    try {
      // Process in batches to manage memory
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchResult = await this.processSingleBatch(batch, source, options, i / batchSize + 1);
        
        results.batches.push(batchResult);
        results.processedDocuments += batchResult.processedCount;
        results.totalChunks += batchResult.chunksCreated;
        results.errors.push(...batchResult.errors);
        
        // Memory management - check and clean if needed
        await this.checkMemoryUsage();
        
        // Small delay between batches to prevent overwhelming the system
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      results.processingTime = Date.now() - batchStartTime;
      this.processingStats.batchesProcessed++;
      
      return results;
      
    } catch (error) {
      console.error(`Error processing batch from ${source}:`, error);
      results.errors.push({
        type: 'BATCH_ERROR',
        message: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Process a single batch of documents
   * @private
   */
  async processSingleBatch(documents, source, options, batchNumber) {
    const batchResult = {
      batchNumber,
      processedCount: 0,
      chunksCreated: 0,
      errors: [],
      processingTime: 0
    };
    
    const startTime = Date.now();
    
    try {
      const promises = documents.map(async (doc, index) => {
        try {
          const chunks = await this.processDocument(doc, source, options);
          return { success: true, chunks: chunks.length, docIndex: index };
        } catch (error) {
          batchResult.errors.push({
            type: 'DOCUMENT_ERROR',
            docIndex: index,
            message: error.message,
            timestamp: new Date()
          });
          return { success: false, chunks: 0, docIndex: index };
        }
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          batchResult.processedCount++;
          batchResult.chunksCreated += result.chunks;
        }
      });
      
      batchResult.processingTime = Date.now() - startTime;
      return batchResult;
      
    } catch (error) {
      batchResult.errors.push({
        type: 'BATCH_PROCESSING_ERROR',
        message: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Extract text content from various document types
   * @private
   */
  extractTextContent(document) {
    let content = '';
    
    // Handle different document structures
    if (typeof document.content === 'string') {
      content = document.content;
    } else if (document.text) {
      content = document.text;
    } else if (document.description) {
      content = document.description;
    } else if (document.body) {
      content = document.body;
    }
    
    // Clean and normalize content
    content = content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\.\,\!\?\;\:\-\_\(\)\[\]\{\}\"\']/g, '') // Remove special chars
      .trim();
    
    return content;
  }

  /**
   * Create text chunks with overlap
   * @private
   */
  createTextChunks(text, options = {}) {
    const chunkSize = options.chunkSize || this.chunkSize;
    const overlap = options.overlap || this.chunkOverlap;
    
    if (text.length <= chunkSize) {
      return [text];
    }
    
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = Math.min(start + chunkSize, text.length);
      
      // Try to end at a sentence boundary if possible
      if (end < text.length) {
        const sentenceEnd = text.lastIndexOf('.', end);
        const questionEnd = text.lastIndexOf('?', end);
        const exclamationEnd = text.lastIndexOf('!', end);
        
        const bestEnd = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        if (bestEnd > start + chunkSize * 0.7) { // At least 70% of chunk size
          end = bestEnd + 1;
        }
      }
      
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      // Move start position with overlap
      start = end - overlap;
      if (start >= text.length) break;
    }
    
    return chunks;
  }

  /**
   * Process individual chunk with metadata
   * @private
   */
  async processChunk(chunkText, sourceDocument, source, chunkIndex, options = {}) {
    try {
      // Extract metadata from source document
      const metadata = this.extractMetadata(sourceDocument, source, chunkIndex);
      
      // Calculate importance score
      const importanceScore = this.calculateImportanceScore(chunkText, metadata);
      
      // Create chunk data structure
      const chunkData = {
        content: chunkText,
        contentType: this.determineContentType(sourceDocument, chunkText),
        sourceId: sourceDocument._id || sourceDocument.id,
        sourceCollection: source,
        metadata: {
          ...metadata,
          chunkIndex,
          chunkLength: chunkText.length,
          wordCount: chunkText.split(/\s+/).length,
          processingTimestamp: new Date(),
          importanceScore
        },
        tags: this.generateTags(chunkText, metadata),
        timeframe: this.extractTimeframe(sourceDocument),
        searchKeywords: this.extractKeywords(chunkText)
      };
      
      return chunkData;
      
    } catch (error) {
      console.error(`Error processing chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  /**
   * Extract metadata from source document
   * @private
   */
  extractMetadata(document, source, chunkIndex) {
    const metadata = {
      source,
      chunkIndex,
      documentId: document._id || document.id,
      createdAt: document.createdAt || document.timestamp || new Date(),
      updatedAt: document.updatedAt || new Date()
    };
    
    // Extract source-specific metadata
    switch (source) {
      case 'analytics':
        metadata.eventType = document.eventType;
        metadata.websiteId = document.websiteId;
        metadata.userId = document.userId;
        metadata.sessionId = document.sessionId;
        break;
        
      case 'transactions':
        metadata.transactionHash = document.transactionHash;
        metadata.contractAddress = document.contractAddress;
        metadata.chainId = document.chainId;
        metadata.blockNumber = document.blockNumber;
        break;
        
      case 'users':
        metadata.userType = document.userType;
        metadata.registrationDate = document.createdAt;
        break;
        
      case 'campaigns':
        metadata.campaignType = document.type;
        metadata.status = document.status;
        metadata.startDate = document.startDate;
        metadata.endDate = document.endDate;
        break;
        
      default:
        // Generic metadata extraction
        if (document.type) metadata.type = document.type;
        if (document.status) metadata.status = document.status;
        if (document.category) metadata.category = document.category;
    }
    
    return metadata;
  }

  /**
   * Calculate importance score for prioritization
   * @private
   */
  calculateImportanceScore(text, metadata) {
    let score = 0.5; // Base score
    
    // Length factor (longer chunks might be more important)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 100) score += 0.1;
    if (wordCount > 200) score += 0.1;
    
    // Recency factor
    const age = Date.now() - (new Date(metadata.createdAt)).getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    if (age < dayInMs) score += 0.2; // Recent data is more important
    else if (age < 7 * dayInMs) score += 0.1;
    
    // Content quality indicators
    if (text.includes('error') || text.includes('failed')) score += 0.1;
    if (text.includes('transaction') || text.includes('contract')) score += 0.1;
    if (text.includes('user') || text.includes('analytics')) score += 0.05;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Determine content type based on source and content
   * @private
   */
  determineContentType(document, text) {
    // Analyze content patterns
    if (text.includes('transaction') || text.includes('0x')) return 'blockchain';
    if (text.includes('user') || text.includes('session')) return 'analytics';
    if (text.includes('campaign') || text.includes('marketing')) return 'marketing';
    if (text.includes('error') || text.includes('exception')) return 'error';
    
    return 'general';
  }

  /**
   * Generate relevant tags for the chunk
   * @private
   */
  generateTags(text, metadata) {
    const tags = [];
    
    // Add source-based tags
    tags.push(metadata.source);
    
    // Add content-based tags
    const lowerText = text.toLowerCase();
    if (lowerText.includes('transaction')) tags.push('transaction');
    if (lowerText.includes('user')) tags.push('user');
    if (lowerText.includes('analytics')) tags.push('analytics');
    if (lowerText.includes('contract')) tags.push('smart-contract');
    if (lowerText.includes('ethereum') || lowerText.includes('eth')) tags.push('ethereum');
    if (lowerText.includes('error') || lowerText.includes('fail')) tags.push('error');
    
    // Add metadata-based tags
    if (metadata.eventType) tags.push(metadata.eventType);
    if (metadata.chainId) tags.push(`chain-${metadata.chainId}`);
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract timeframe information
   * @private
   */
  extractTimeframe(document) {
    const timestamp = document.createdAt || document.timestamp || new Date();
    const date = new Date(timestamp);
    
    return {
      timestamp: date,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      dayOfWeek: date.getDay(),
      quarter: Math.floor(date.getMonth() / 3) + 1
    };
  }

  /**
   * Extract keywords for search optimization
   * @private
   */
  extractKeywords(text) {
    // Simple keyword extraction - can be enhanced with NLP
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Get unique words and their frequencies
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Check if word is a stop word
   * @private
   */
  isStopWord(word) {
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'she', 'use', 'way', 'will', 'with'];
    return stopWords.includes(word);
  }

  /**
   * Check memory usage and clean if needed
   * @private
   */
  async checkMemoryUsage() {
    const usage = process.memoryUsage();
    this.memoryUsage.current = usage.heapUsed;
    
    if (usage.heapUsed > this.memoryUsage.peak) {
      this.memoryUsage.peak = usage.heapUsed;
    }
    
    if (usage.heapUsed > this.memoryUsage.threshold) {
      console.warn(`Memory usage high: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      memoryUsage: this.memoryUsage,
      config: {
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
        batchSize: this.batchSize,
        maxConcurrentJobs: this.maxConcurrentJobs
      }
    };
  }

  /**
   * Reset processing statistics
   */
  resetStats() {
    this.processingStats = {
      documentsProcessed: 0,
      chunksCreated: 0,
      batchesProcessed: 0,
      totalProcessingTime: 0,
      errors: 0,
      lastProcessedAt: null
    };
    
    this.memoryUsage.current = 0;
    this.memoryUsage.peak = 0;
  }

  /**
   * Perform semantic search using vector similarity
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {Object} filters - Search filters (siteId, teamId, etc.)
   * @param {Object} options - Search options (limit, threshold, etc.)
   * @returns {Promise<Array>} Array of relevant documents
   */
  async performSemanticSearch(queryEmbedding, filters = {}, options = {}) {
    try {
      const limit = options.limit || 10;
      const threshold = options.threshold || 0.7;
      
      // Build MongoDB aggregation pipeline for vector similarity search
      const pipeline = [
        // Match basic filters
        {
          $match: {
            ...(filters.siteId && { siteId: filters.siteId }),
            ...(filters.teamId && { teamId: new mongoose.Types.ObjectId(filters.teamId) }),
            ...(filters.sourceType && { sourceType: filters.sourceType }),
            status: filters.status || 'active'
          }
        },
        
        // Add vector similarity score
        {
          $addFields: {
            similarity: {
              $let: {
                vars: {
                  dotProduct: {
                    $reduce: {
                      input: { $range: [0, { $size: "$embedding" }] },
                      initialValue: 0,
                      in: {
                        $add: [
                          "$$value",
                          {
                            $multiply: [
                              { $arrayElemAt: ["$embedding", "$$this"] },
                              { $arrayElemAt: [queryEmbedding.embedding || queryEmbedding, "$$this"] }
                            ]
                          }
                        ]
                      }
                    }
                  }
                },
                in: "$$dotProduct"
              }
            }
          }
        },
        
        // Filter by similarity threshold
        {
          $match: {
            similarity: { $gte: threshold }
          }
        },
        
        // Sort by similarity (descending)
        {
          $sort: { similarity: -1 }
        },
        
        // Limit results
        {
          $limit: limit
        },
        
        // Project relevant fields
        {
          $project: {
            documentId: 1,
            sourceType: 1,
            sourceId: 1,
            siteId: 1,
            teamId: 1,
            content: 1,
            summary: 1,
            metadata: 1,
            similarity: 1,
            createdAt: 1
          }
        }
      ];
      
      // Execute search
      const results = await VectorDocument.aggregate(pipeline);
      
      // Log search performance
      console.log(`Semantic search completed: ${results.length} results found with similarity >= ${threshold}`);
      
      return results;
      
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw error;
    }
  }
}

// Create a singleton instance for the semantic search function
const documentProcessingService = new DocumentProcessingService();

// Export both the class and the semantic search function
module.exports = DocumentProcessingService;
module.exports.performSemanticSearch = documentProcessingService.performSemanticSearch.bind(documentProcessingService); 