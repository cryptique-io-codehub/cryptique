# Vector Database Infrastructure Setup Guide

## 🎯 Overview

This guide walks you through setting up the vector database infrastructure for CQ Intelligence RAG implementation. The system includes:

- **Vector Document Storage**: MongoDB collections for storing embeddings with metadata
- **Embedding Job Management**: Queue system for processing data into embeddings
- **Statistics Tracking**: Comprehensive metrics and monitoring
- **Gemini Integration**: Google's Gemini API for generating embeddings

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 14.x or higher (16.x+ recommended)
- **MongoDB**: Version 4.4 or higher
- **npm**: Latest version

### Required API Keys
- **Gemini API Key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **MongoDB Connection String**: Local or cloud MongoDB instance

## 🚀 Installation Steps

### Step 1: Install Dependencies

```bash
cd cryptique/backend
npm install
```

This will install:
- `@google/generative-ai`: Gemini API client
- `node-cache`: In-memory caching for embeddings
- `mongoose`: MongoDB ODM (already installed)
- Testing libraries: `mocha`, `chai`, `sinon`, `chalk`

### Step 2: Environment Configuration

Create or update your `.env` file:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/cryptique-production
TEST_MONGODB_URI=mongodb://localhost:27017/cryptique-test-vector

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Logging and Debug
VERBOSE=false
CLEANUP=true
```

### Step 3: Database Setup

The vector collections will be created automatically when you first run the application. The system includes:

#### Collections Created:
1. **`vectordocuments`**: Stores embeddings with metadata
2. **`embeddingjobs`**: Manages processing queue
3. **`embeddingstats`**: Tracks system metrics

#### Indexes Created Automatically:
- **Performance indexes** on frequently queried fields
- **Compound indexes** for complex queries
- **Text indexes** for content search
- **TTL indexes** for automatic cleanup

### Step 4: Verify Installation

Run the infrastructure validation test:

```bash
npm run test:vector
```

This will validate:
- ✅ Database connections
- ✅ Model schemas and validation
- ✅ Index creation and performance
- ✅ Service initialization
- ✅ Error handling

Expected output:
```
Starting Vector Database Infrastructure Tests
✓ Database connection
✓ VectorDocument model creation
✓ VectorDocument validation
✓ EmbeddingJob model creation
✓ EmbeddingStats model creation

==================================================
VECTOR DATABASE TEST REPORT
==================================================
✓ Passed: 5
✗ Failed: 0
Success Rate: 100%
Duration: 1234ms
==================================================
```

### Step 5: Run Unit Tests

Execute the full test suite:

```bash
npm test
```

For continuous testing during development:

```bash
npm run test:watch
```

## 📊 Database Schema Overview

### VectorDocument Schema
```javascript
{
  documentId: String,           // Unique identifier
  sourceType: String,           // 'analytics', 'transaction', etc.
  sourceId: ObjectId,           // Reference to source document
  siteId: String,               // Site identifier
  teamId: ObjectId,             // Team reference
  embedding: [Number],          // 1536-dimensional vector
  content: String,              // Original content
  summary: String,              // Content summary
  metadata: {
    timeframe: { start: Date, end: Date },
    dataType: String,           // 'metric', 'event', etc.
    tags: [String],
    importance: Number,         // 1-10 scale
    // ... additional metadata
  },
  status: String,               // 'active', 'archived', 'deprecated'
  version: Number,              // Document version
  createdAt: Date,
  updatedAt: Date
}
```

### EmbeddingJob Schema
```javascript
{
  jobId: String,                // Unique job identifier
  jobType: String,              // 'initial_processing', 'reprocessing', etc.
  priority: Number,             // 1-10 priority scale
  sourceType: String,           // Source data type
  sourceIds: [ObjectId],        // Documents to process
  teamId: ObjectId,             // Team reference
  status: String,               // 'pending', 'processing', 'completed', etc.
  progress: {
    total: Number,
    processed: Number,
    failed: Number,
    percentage: Number          // Auto-calculated
  },
  config: {
    batchSize: Number,
    chunkSize: Number,
    overlapSize: Number
  },
  results: {
    documentsCreated: Number,
    totalTokensUsed: Number,
    totalCost: Number
  },
  // ... error handling, retry logic, etc.
}
```

## 🔧 Configuration Options

### Gemini Embedding Service Configuration

```javascript
// In your service initialization
const geminiService = require('./services/geminiEmbeddingService');

// Configuration is automatic, but you can monitor:
const stats = geminiService.getStats();
console.log('Service stats:', stats);

// Health check
const health = await geminiService.healthCheck();
console.log('Service health:', health);
```

### Rate Limiting Configuration

The service includes built-in rate limiting:
- **60 requests per minute** (Gemini API limit)
- **1000 requests per day** (configurable)
- **Automatic retry** with exponential backoff
- **Connection pooling** (max 5 concurrent)

### Caching Configuration

Embeddings are cached automatically:
- **1 hour TTL** for embedding results
- **10,000 key limit** to prevent memory issues
- **SHA256 hashing** for cache keys
- **Automatic cleanup** of expired entries

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests** (`test/vectorDatabase.test.js`):
   - Model validation
   - Schema constraints
   - Index performance
   - Error handling

2. **Integration Tests** (`test/geminiEmbedding.test.js`):
   - API integration
   - Rate limiting
   - Caching behavior
   - Batch processing

3. **Infrastructure Tests** (`scripts/testVectorInfrastructure.js`):
   - Database connections
   - Performance validation
   - Concurrent operations

### Running Specific Tests

```bash
# Run only vector database tests
npm test -- --grep "Vector Database"

# Run only Gemini service tests
npm test -- --grep "Gemini Embedding"

# Run with verbose output
VERBOSE=true npm run test:vector

# Run without cleanup (for debugging)
CLEANUP=false npm run test:vector
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
Error: Failed to establish database connection
```
**Solution**: Check MongoDB is running and connection string is correct

#### 2. Gemini API Errors
```bash
Error: Invalid embedding model specified
```
**Solution**: Verify `GEMINI_API_KEY` is set and valid

#### 3. Embedding Dimension Errors
```bash
ValidationError: Embedding must have exactly 1536 dimensions
```
**Solution**: This is expected behavior - Gemini embeddings are 1536-dimensional

#### 4. Memory Issues
```bash
Error: JavaScript heap out of memory
```
**Solution**: Reduce batch sizes or increase Node.js memory limit:
```bash
node --max-old-space-size=4096 scripts/testVectorInfrastructure.js
```

### Debug Mode

Enable verbose logging:

```bash
VERBOSE=true npm run test:vector
```

### Performance Monitoring

Monitor system performance:

```javascript
const geminiService = require('./services/geminiEmbeddingService');

// Listen to service events
geminiService.on('embeddingGenerated', (data) => {
  console.log('Embedding generated:', data);
});

geminiService.on('rateLimitHit', (data) => {
  console.log('Rate limit hit:', data);
});

geminiService.on('error', (error) => {
  console.error('Service error:', error);
});
```

## 📈 Performance Expectations

### Benchmarks (on moderate hardware)

- **Database Operations**: < 50ms for indexed queries
- **Embedding Generation**: 200-500ms per request
- **Batch Processing**: 10-50 documents per minute
- **Memory Usage**: ~100MB for 10K cached embeddings
- **Concurrent Operations**: 20+ simultaneous without issues

### Optimization Tips

1. **Use batch processing** for large datasets
2. **Enable caching** for repeated content
3. **Monitor rate limits** to avoid API throttling
4. **Use appropriate chunk sizes** (1000-2000 characters)
5. **Implement proper error handling** for retries

## 🔄 Next Steps

After successful setup:

1. **Implement Data Processing Pipeline** (Phase 2)
2. **Create Migration Scripts** for existing data
3. **Set up RAG Services** for query processing
4. **Integrate with Frontend** components
5. **Deploy and Monitor** in production

## 📚 Additional Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [MongoDB Indexing Best Practices](https://docs.mongodb.com/manual/indexes/)
- [Vector Database Design Patterns](https://www.mongodb.com/developer/products/atlas/semantic-search-mongodb-atlas-vector-search/)

---

**Status**: ✅ Phase 1 Complete - Vector Database Infrastructure Ready
**Next Phase**: Data Processing Pipeline Implementation 