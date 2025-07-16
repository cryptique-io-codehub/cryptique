# Vector Database Setup for CQ Intelligence

This document provides comprehensive instructions for setting up and managing the MongoDB Atlas Vector Search infrastructure for CQ Intelligence RAG implementation.

## 🎯 Overview

The vector database system provides:
- **1536-dimensional embeddings** using Gemini API
- **MongoDB Atlas Vector Search** for semantic similarity
- **Hybrid search** combining vector and text search
- **Comprehensive monitoring** and alerting
- **Automated backup and recovery**
- **Performance optimization** and caching
- **Circuit breaker** pattern for resilience

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 16.x or higher
- **MongoDB Atlas**: Cluster with Vector Search support
- **npm**: Latest version

### Required Environment Variables
```bash
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
MONGODB_DATABASE=cryptique

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Monitoring and Alerts
ALERT_WEBHOOK=https://your-webhook-url.com
ALERT_EMAIL=admin@yourcompany.com

# Optional: Backup Configuration
BACKUP_ENCRYPTION_KEY=your-encryption-key-here
BACKUP_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

## 🚀 Quick Start

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Run complete vector database setup
npm run vector:init

# Or run individual steps
npm run vector:setup
npm run vector:test
```

### 2. Verify Installation
```bash
# Check database health
npm run vector:health

# View database statistics
npm run vector:stats

# Run comprehensive tests
npm run test:vector
```

### 3. Create Vector Search Index in Atlas

**⚠️ Important**: This step must be done manually in MongoDB Atlas UI:

1. Go to [MongoDB Atlas Dashboard](https://cloud.mongodb.com)
2. Navigate to your cluster
3. Click "Search" tab
4. Click "Create Search Index"
5. Select "Vector Search"
6. Use this configuration:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "siteId"
    },
    {
      "type": "filter",
      "path": "teamId"
    },
    {
      "type": "filter",
      "path": "sourceType"
    },
    {
      "type": "filter",
      "path": "status"
    },
    {
      "type": "filter",
      "path": "metadata.timeframe"
    }
  ]
}
```

7. Name the index: `vector_index`
8. Select collection: `vectordocuments`
9. Click "Create Search Index"

⏳ **Index creation takes 5-10 minutes**

## 📊 Database Schema

### VectorDocument Collection
```javascript
{
  documentId: String,           // Unique identifier
  sourceType: String,           // 'analytics', 'transaction', etc.
  sourceId: ObjectId,           // Reference to source document
  siteId: String,              // Site identifier
  teamId: ObjectId,            // Team identifier
  embedding: [Number],         // 1536-dimensional vector
  content: String,             // Original text content
  status: String,              // 'active', 'archived', 'deprecated'
  metadata: {
    dataType: String,          // 'metric', 'event', 'insight', etc.
    timeframe: {
      start: Date,
      end: Date
    },
    importance: Number,        // 1-10 importance score
    tags: [String],
    category: String,
    // ... additional metadata
  },
  version: Number,             // Version for optimistic locking
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date             // TTL for data retention
}
```

### Supporting Collections
- **embeddingjobs**: Job queue for processing embeddings
- **embeddingstats**: Performance and usage metrics
- **vectorbackups**: Backup metadata and configuration
- **vectormonitoring**: Monitoring configuration and alerts

## 🔧 API Usage

### Basic Vector Operations

```javascript
const { vectorDatabase } = require('./config/vectorDatabase');

// Initialize connection
await vectorDatabase.initialize();

// Insert vector documents
const documents = [{
  documentId: 'doc_1',
  sourceType: 'analytics',
  sourceId: new ObjectId(),
  siteId: 'site_123',
  teamId: new ObjectId(),
  embedding: Array(1536).fill(0).map(() => Math.random()),
  content: 'User analytics data showing increased engagement',
  status: 'active',
  metadata: {
    dataType: 'metric',
    importance: 8,
    timeframe: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-31')
    }
  }
}];

await vectorDatabase.insertVectorDocuments(documents);

// Vector similarity search
const queryVector = Array(1536).fill(0).map(() => Math.random());
const results = await vectorDatabase.vectorSearch(queryVector, {
  siteId: 'site_123',
  teamId: teamId,
  status: 'active'
}, {
  limit: 10,
  numCandidates: 100
});

// Hybrid search (vector + text)
const hybridResults = await vectorDatabase.hybridSearch(
  queryVector,
  'user engagement analytics',
  {
    siteId: 'site_123',
    status: 'active'
  },
  {
    limit: 5,
    vectorWeight: 0.7,
    textWeight: 0.3
  }
);

// Update documents
await vectorDatabase.updateVectorDocument(
  'doc_1',
  { content: 'Updated content' },
  { expectedVersion: 1 }
);

// Soft delete
await vectorDatabase.deleteVectorDocuments(
  { documentId: 'doc_1' }
);

// Get statistics
const stats = await vectorDatabase.getStats();
console.log(stats);
```

### Monitoring and Health Checks

```javascript
const { vectorMonitoringService } = require('./services/vectorMonitoringService');

// Start monitoring
await vectorMonitoringService.start();

// Get dashboard data
const dashboard = vectorMonitoringService.getDashboardData();

// Get performance report
const report = vectorMonitoringService.getPerformanceReport();

// Stop monitoring
await vectorMonitoringService.stop();
```

## 🔄 Backup and Recovery

### Automated Backups

```bash
# Create full backup
npm run vector:backup:full

# Create incremental backup
npm run vector:backup:incremental

# List available backups
npm run vector:backup:list

# Check backup status
npm run vector:backup:status
```

### Manual Backup Operations

```javascript
const { VectorBackupRestore } = require('./scripts/vectorBackupRestore');

const backup = new VectorBackupRestore({
  backupDir: './backups/vector',
  compression: true,
  encryption: true,
  cloudStorage: {
    enabled: true,
    provider: 'aws',
    bucket: 'my-backup-bucket'
  }
});

// Create full backup
const fullBackup = await backup.createFullBackup();

// Create incremental backup
const incrementalBackup = await backup.createIncrementalBackup();

// List backups
const backups = await backup.listBackups();

// Restore from backup
await backup.restoreFromBackup('full_1640995200000');
```

### Restore Operations

```bash
# Restore from specific backup
npm run vector:restore full_1640995200000

# List available backups first
npm run vector:backup:list
```

## 📈 Performance Optimization

### Connection Pooling
```javascript
const vectorDb = new VectorDatabase({
  pooling: {
    minPoolSize: 5,
    maxPoolSize: 50,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000
  }
});
```

### Query Optimization
```javascript
// Use proper indexes
const results = await vectorDatabase.vectorSearch(queryVector, {
  siteId: 'site_123',        // Indexed field
  teamId: teamId,            // Indexed field
  sourceType: 'analytics',   // Indexed field
  status: 'active'           // Indexed field
});

// Use projection to reduce data transfer
const results = await vectorDatabase.vectorSearch(queryVector, filters, {
  projection: {
    documentId: 1,
    content: 1,
    metadata: 1,
    score: 1
  }
});
```

### Caching Configuration
```javascript
const vectorDb = new VectorDatabase({
  caching: {
    enabled: true,
    maxSize: 1000,
    ttl: 300000  // 5 minutes
  }
});
```

## 🚨 Monitoring and Alerting

### Real-time Monitoring

```bash
# Start monitoring service
npm run vector:monitoring:start
```

### Alert Configuration

```javascript
const monitoring = new VectorMonitoringService({
  thresholds: {
    queryLatency: 5000,      // 5 seconds
    errorRate: 0.05,         // 5%
    memoryUsage: 0.85,       // 85%
    cacheHitRate: 0.7        // 70%
  },
  alerting: {
    enabled: true,
    webhookUrl: process.env.ALERT_WEBHOOK,
    cooldownPeriod: 300000,  // 5 minutes
    maxAlertsPerHour: 10
  }
});
```

### Health Checks

```javascript
// Database health check
const health = await vectorDatabase.healthCheck();
console.log(health);
// Output:
// {
//   status: 'healthy',
//   responseTime: 45,
//   connected: true,
//   vectorIndexExists: true,
//   circuitBreakerState: 'closed',
//   metrics: { ... }
// }
```

## 🧪 Testing

### Unit Tests
```bash
# Run all vector database tests
npm run test:vector

# Run with verbose output
npm run test:vector:verbose

# Run without cleanup (for debugging)
npm run test:vector:no-cleanup
```

### Integration Tests
```bash
# Test vector infrastructure
npm run vector:test

# Test with specific configuration
MONGODB_URI=mongodb://localhost:27017/test npm run vector:test
```

### Performance Tests
```javascript
// Example performance test
describe('Performance Tests', function() {
  it('should insert 1000 documents in under 5 seconds', async function() {
    const documents = Array(1000).fill(0).map((_, i) => ({
      documentId: `perf_${i}`,
      // ... document structure
    }));
    
    const startTime = Date.now();
    await vectorDatabase.insertVectorDocuments(documents);
    const duration = Date.now() - startTime;
    
    expect(duration).to.be.lessThan(5000);
  });
});
```

## 🔒 Security

### Encryption
- **At Rest**: MongoDB Atlas encryption
- **In Transit**: TLS/SSL connections
- **Backups**: AES-256 encryption

### Access Control
```javascript
// Role-based access control
const results = await vectorDatabase.vectorSearch(queryVector, {
  teamId: user.teamId,  // Restrict to user's team
  siteId: user.siteId   // Restrict to user's sites
});
```

### Rate Limiting
```javascript
const vectorDb = new VectorDatabase({
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    requestsPerHour: 1000
  }
});
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Connection Errors
```bash
Error: Failed to establish database connection
```
**Solution**: Check MongoDB URI and network connectivity
```bash
# Test connection
npm run vector:health
```

#### 2. Vector Search Index Missing
```bash
Error: Vector search index not found
```
**Solution**: Create index in MongoDB Atlas UI (see setup instructions)

#### 3. Embedding Dimension Errors
```bash
ValidationError: Embedding must have exactly 1536 dimensions
```
**Solution**: Verify Gemini API response format

#### 4. Memory Issues
```bash
Error: JavaScript heap out of memory
```
**Solution**: Increase Node.js memory limit
```bash
node --max-old-space-size=4096 scripts/setupVectorDatabase.js
```

### Debug Mode
```bash
# Enable verbose logging
VERBOSE=true npm run vector:setup

# Run with debug output
DEBUG=vector:* npm run vector:test
```

### Performance Issues
```javascript
// Check query performance
const stats = await vectorDatabase.getStats();
console.log('Average query time:', stats.performance.averageQueryTime);

// Monitor cache hit rate
const dashboard = vectorMonitoringService.getDashboardData();
console.log('Cache hit rate:', dashboard.system.cacheHitRate);
```

## 📚 Advanced Configuration

### Custom Vector Index
```javascript
const customVectorDb = new VectorDatabase({
  vectorIndex: {
    name: 'custom_vector_index',
    dimensions: 1536,
    similarity: 'euclidean',  // or 'dotProduct'
    algorithm: 'hnsw'
  }
});
```

### Sharding Configuration
```javascript
// For large-scale deployments
const shardedVectorDb = new VectorDatabase({
  sharding: {
    enabled: true,
    shardKey: { teamId: 1, siteId: 1 },
    numShards: 4
  }
});
```

### Custom TTL Settings
```javascript
const vectorDb = new VectorDatabase({
  ttl: {
    defaultTTL: 60 * 24 * 60 * 60,  // 60 days
    archiveTTL: 90 * 24 * 60 * 60,  // 90 days
    deprecatedTTL: 7 * 24 * 60 * 60  // 7 days
  }
});
```

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment variables
export NODE_ENV=production
export MONGODB_URI=mongodb+srv://prod-user:password@prod-cluster.mongodb.net/cryptique
export GEMINI_API_KEY=production-gemini-key
export ALERT_WEBHOOK=https://prod-alerts.company.com/webhook
```

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'vector-monitoring',
    script: './services/vectorMonitoringService.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### Monitoring Setup
```bash
# Start production monitoring
pm2 start ecosystem.config.js --env production

# View logs
pm2 logs vector-monitoring

# Monitor performance
pm2 monit
```

## 📊 Maintenance

### Regular Tasks
```bash
# Daily backup
0 2 * * * npm run vector:backup:incremental

# Weekly full backup
0 2 * * 0 npm run vector:backup:full

# Monthly cleanup
0 3 1 * * npm run vector:cleanup
```

### Health Monitoring
```bash
# Automated health checks
*/5 * * * * npm run vector:health >> /var/log/vector-health.log
```

### Performance Monitoring
```bash
# Daily performance reports
0 9 * * * npm run vector:performance-report
```

## 🔗 Integration with CQ Intelligence

### RAG Pipeline Integration
```javascript
const { vectorDatabase } = require('./config/vectorDatabase');
const { GeminiEmbeddingService } = require('./services/geminiEmbeddingService');

// Generate query embedding
const embeddingService = new GeminiEmbeddingService();
const queryEmbedding = await embeddingService.generateEmbedding(userQuery);

// Perform semantic search
const relevantDocs = await vectorDatabase.vectorSearch(
  queryEmbedding.embedding,
  {
    siteId: user.siteId,
    teamId: user.teamId,
    status: 'active'
  },
  {
    limit: 5,
    minScore: 0.7
  }
);

// Use results for RAG
const context = relevantDocs.map(doc => doc.content).join('\n');
const ragResponse = await generateResponse(userQuery, context);
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Run diagnostic tests: `npm run vector:test`
3. Check logs: `tail -f logs/vector-*.log`
4. Review monitoring dashboard
5. Contact the development team

## 🎯 Next Steps

1. **Phase 2**: Implement advanced RAG features
2. **Phase 3**: Add multi-modal embedding support
3. **Phase 4**: Implement federated search across multiple sites
4. **Phase 5**: Add real-time embedding updates

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Compatibility**: Node.js 16+, MongoDB Atlas 6.0+ 