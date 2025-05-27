# Cryptique Analytics RAG Implementation

This directory contains the Retrieval Augmented Generation (RAG) implementation for Cryptique Analytics. The system enhances the analytics querying capabilities by transforming raw data into natural language descriptions and enabling semantic search through vector embeddings.

## Architecture

The RAG system consists of four main components:

1. **Data Transformation** (`transformers/`)
   - Converts raw analytics data into human-readable text descriptions
   - Handles both website analytics and smart contract data
   - Maintains context and relationships in the transformed text

2. **Chunking** (`chunkers/`)
   - Breaks down transformed text into semantic chunks
   - Preserves metadata and context for each chunk
   - Ensures optimal chunk size for vector embedding

3. **Vector Embedding** (`embeddings/`)
   - Uses Google's Gemini API for generating embeddings
   - Handles batch processing with rate limiting
   - Maintains consistent vector dimensions

4. **Vector Storage** (`vectorstore/`)
   - Utilizes MongoDB Atlas Vector Search
   - Implements efficient similarity search
   - Manages data retention and cleanup

## Setup Instructions

1. **Environment Variables**
   Create a `.env` file in the server root with:
   ```
   MONGODB_URI=your_mongodb_atlas_uri
   GEMINI_API=your_gemini_api_key
   NODE_ENV=development
   LOG_LEVEL=info
   ```

2. **MongoDB Atlas Setup**
   - Create a vector search index named `vector_index` on the `vector_entries` collection
   - Index configuration:
     ```json
     {
       "mappings": {
         "dynamic": true,
         "fields": {
           "vector": {
             "dimensions": 768,
             "similarity": "cosine",
             "type": "knnVector"
           }
         }
       }
     }
     ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Directory Structure**
   ```
   rag/
   ├── transformers/
   │   └── analyticsTransformer.js
   ├── chunkers/
   │   └── analyticsChunker.js
   ├── embeddings/
   │   └── geminiEmbedding.js
   ├── vectorstore/
   │   └── mongoVectorStore.js
   ├── config.js
   ├── ragService.js
   └── README.md
   ```

## Usage Example

```javascript
const ragService = require('./rag/ragService');

// Process website analytics
await ragService.processWebsiteAnalytics(websiteData, {
  siteId: 'site123',
  domain: 'example.com',
  timestamp: new Date()
});

// Process contract analytics
await ragService.processContractAnalytics(contractData, {
  contractId: 'contract123',
  contractAddress: '0x...',
  blockchain: 'ethereum',
  timestamp: new Date()
});

// Query analytics
const result = await ragService.queryAnalytics(
  "What's the user engagement trend?",
  {
    selectedSites: ['site123'],
    selectedContracts: ['contract123'],
    timeRange: {
      start: new Date('2024-01-01'),
      end: new Date()
    }
  }
);
```

## Maintenance

- Vector data is automatically cleaned up after 7 days (configurable)
- Run cleanup manually:
  ```javascript
  await ragService.cleanupOldVectors(7); // Keep last 7 days
  ```

## Error Handling

The system implements comprehensive error handling:
- Input validation at each stage
- Graceful degradation for API failures
- Detailed error logging
- Automatic retries for transient failures

## Performance Considerations

1. **Batch Processing**
   - Analytics are processed in batches
   - Configurable batch size and processing interval
   - Rate limiting for API calls

2. **Vector Search**
   - Efficient similarity search using MongoDB Atlas
   - Configurable number of results (top-K)
   - Metadata filtering for focused results

3. **Data Retention**
   - Automatic cleanup of old vectors
   - Configurable retention period
   - Index optimization

## Contributing

1. Follow the established code structure
2. Add comprehensive error handling
3. Update tests for new functionality
4. Document any configuration changes
5. Test performance impact of changes 