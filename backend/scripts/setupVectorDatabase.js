#!/usr/bin/env node

/**
 * Vector Database Setup Script for CQ Intelligence
 * 
 * This script initializes the MongoDB Atlas Vector Search infrastructure
 * for the CQ Intelligence RAG system.
 */

const { vectorDatabase } = require('../config/vectorDatabase');
const logger = require('../config/logger');
const mongoose = require('mongoose');

class VectorDatabaseSetup {
  constructor() {
    this.setupSteps = [
      'validateEnvironment',
      'connectToDatabase',
      'createCollections',
      'setupIndexes',
      'configureSharding',
      'setupBackupProcedures',
      'configureMonitoring',
      'validateSetup',
      'performanceTest'
    ];
    
    this.results = {
      success: [],
      warnings: [],
      errors: []
    };
  }
  
  /**
   * Run the complete setup process
   */
  async run() {
    console.log('🚀 Starting Vector Database Setup for CQ Intelligence...\n');
    
    try {
      for (const step of this.setupSteps) {
        console.log(`📋 Executing: ${step}...`);
        await this[step]();
        console.log(`✅ Completed: ${step}\n`);
      }
      
      this.printSummary();
      
    } catch (error) {
      console.error(`❌ Setup failed at step: ${error.step || 'unknown'}`);
      console.error(`Error: ${error.message}`);
      this.printSummary();
      process.exit(1);
    }
  }
  
  /**
   * Step 1: Validate Environment
   */
  async validateEnvironment() {
    const requiredEnvVars = [
      'MONGODB_URI',
      'GEMINI_API_KEY',
      'NODE_ENV'
    ];
    
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate MongoDB URI format
    if (!process.env.MONGODB_URI.includes('mongodb')) {
      throw new Error('Invalid MongoDB URI format');
    }
    
    // Check if MongoDB Atlas (required for Vector Search)
    if (!process.env.MONGODB_URI.includes('mongodb.net') && !process.env.MONGODB_URI.includes('mongodb+srv')) {
      this.results.warnings.push('Vector Search requires MongoDB Atlas. Local MongoDB detected.');
    }
    
    this.results.success.push('Environment validation completed');
  }
  
  /**
   * Step 2: Connect to Database
   */
  async connectToDatabase() {
    try {
      await vectorDatabase.initialize();
      this.results.success.push('Database connection established');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
  
  /**
   * Step 3: Create Collections
   */
  async createCollections() {
    try {
      const db = vectorDatabase.db;
      
      // Create vectordocuments collection with schema validation
      const vectorDocumentsSchema = {
        $jsonSchema: {
          bsonType: 'object',
          required: ['documentId', 'sourceType', 'sourceId', 'siteId', 'teamId', 'embedding', 'content'],
          properties: {
            documentId: {
              bsonType: 'string',
              description: 'Unique identifier for the document'
            },
            sourceType: {
              bsonType: 'string',
              enum: ['analytics', 'transaction', 'session', 'campaign', 'website', 'user_journey', 'smart_contract'],
              description: 'Type of source data'
            },
            sourceId: {
              bsonType: 'objectId',
              description: 'Reference to source document'
            },
            siteId: {
              bsonType: 'string',
              description: 'Site identifier'
            },
            teamId: {
              bsonType: 'objectId',
              description: 'Team identifier'
            },
            embedding: {
              bsonType: 'array',
              items: {
                bsonType: 'double'
              },
              minItems: 1536,
              maxItems: 1536,
              description: 'Vector embedding (1536 dimensions)'
            },
            content: {
              bsonType: 'string',
              maxLength: 8000,
              description: 'Original content that was embedded'
            },
            status: {
              bsonType: 'string',
              enum: ['active', 'archived', 'deprecated'],
              description: 'Document status'
            },
            metadata: {
              bsonType: 'object',
              description: 'Additional metadata'
            }
          }
        }
      };
      
      // Create collection with validation
      try {
        await db.createCollection('vectordocuments', {
          validator: vectorDocumentsSchema,
          validationLevel: 'strict',
          validationAction: 'error'
        });
        this.results.success.push('Created vectordocuments collection with schema validation');
      } catch (error) {
        if (error.code === 48) { // Collection already exists
          this.results.warnings.push('vectordocuments collection already exists');
        } else {
          throw error;
        }
      }
      
      // Create supporting collections
      const supportingCollections = [
        'embeddingjobs',
        'embeddingstats',
        'vectorbackups'
      ];
      
      for (const collectionName of supportingCollections) {
        try {
          await db.createCollection(collectionName);
          this.results.success.push(`Created ${collectionName} collection`);
        } catch (error) {
          if (error.code === 48) { // Collection already exists
            this.results.warnings.push(`${collectionName} collection already exists`);
          } else {
            throw error;
          }
        }
      }
      
    } catch (error) {
      throw new Error(`Collection creation failed: ${error.message}`);
    }
  }
  
  /**
   * Step 4: Setup Indexes
   */
  async setupIndexes() {
    try {
      // This will create all necessary indexes
      await vectorDatabase.setupIndexes();
      this.results.success.push('All database indexes created successfully');
    } catch (error) {
      throw new Error(`Index setup failed: ${error.message}`);
    }
  }
  
  /**
   * Step 5: Configure Sharding (for production)
   */
  async configureSharding() {
    try {
      const db = vectorDatabase.db;
      
      // Check if sharding is available (MongoDB Atlas clusters)
      const adminDb = db.admin();
      
      try {
        const shardingStatus = await adminDb.command({ listShards: 1 });
        
        if (shardingStatus.shards && shardingStatus.shards.length > 0) {
          // Enable sharding on database
          await adminDb.command({ enableSharding: db.databaseName });
          
          // Shard the vectordocuments collection
          await adminDb.command({
            shardCollection: `${db.databaseName}.vectordocuments`,
            key: { teamId: 1, siteId: 1 }
          });
          
          this.results.success.push('Sharding configured for vectordocuments collection');
        } else {
          this.results.warnings.push('Sharding not available - single node deployment');
        }
      } catch (error) {
        this.results.warnings.push('Sharding configuration skipped - not available in current deployment');
      }
      
    } catch (error) {
      this.results.warnings.push(`Sharding configuration warning: ${error.message}`);
    }
  }
  
  /**
   * Step 6: Setup Backup Procedures
   */
  async setupBackupProcedures() {
    try {
      const db = vectorDatabase.db;
      
      // Create backup metadata collection
      try {
        await db.createCollection('vectorbackups', {
          validator: {
            $jsonSchema: {
              bsonType: 'object',
              required: ['backupId', 'timestamp', 'type', 'status'],
              properties: {
                backupId: { bsonType: 'string' },
                timestamp: { bsonType: 'date' },
                type: { bsonType: 'string', enum: ['full', 'incremental'] },
                status: { bsonType: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
                collections: { bsonType: 'array' },
                size: { bsonType: 'long' },
                location: { bsonType: 'string' }
              }
            }
          }
        });
        this.results.success.push('Created backup metadata collection');
      } catch (error) {
        if (error.code === 48) {
          this.results.warnings.push('Backup metadata collection already exists');
        } else {
          throw error;
        }
      }
      
      // Create backup procedure document
      const backupProcedure = {
        _id: 'backup_config',
        schedule: {
          full: '0 2 * * 0', // Weekly full backup at 2 AM Sunday
          incremental: '0 2 * * 1-6' // Daily incremental backup at 2 AM
        },
        retention: {
          full: 4, // Keep 4 full backups
          incremental: 7 // Keep 7 incremental backups
        },
        collections: ['vectordocuments', 'embeddingjobs', 'embeddingstats'],
        compression: true,
        encryption: true,
        lastBackup: null,
        nextBackup: null
      };
      
      await db.collection('vectorbackups').replaceOne(
        { _id: 'backup_config' },
        backupProcedure,
        { upsert: true }
      );
      
      this.results.success.push('Backup procedures configured');
      
    } catch (error) {
      throw new Error(`Backup setup failed: ${error.message}`);
    }
  }
  
  /**
   * Step 7: Configure Monitoring
   */
  async configureMonitoring() {
    try {
      const db = vectorDatabase.db;
      
      // Create monitoring configuration collection
      try {
        await db.createCollection('vectormonitoring');
        this.results.success.push('Created monitoring configuration collection');
      } catch (error) {
        if (error.code === 48) {
          this.results.warnings.push('Monitoring collection already exists');
        } else {
          throw error;
        }
      }
      
      // Configure monitoring settings
      const monitoringConfig = {
        _id: 'monitoring_config',
        alerts: {
          queryLatency: {
            threshold: 5000, // 5 seconds
            enabled: true
          },
          errorRate: {
            threshold: 0.05, // 5%
            enabled: true
          },
          diskUsage: {
            threshold: 0.8, // 80%
            enabled: true
          },
          connectionPool: {
            threshold: 0.9, // 90% of max connections
            enabled: true
          }
        },
        metrics: {
          collection: 'vectormetrics',
          retention: 30, // days
          interval: 60 // seconds
        },
        notifications: {
          email: process.env.ALERT_EMAIL || null,
          webhook: process.env.ALERT_WEBHOOK || null
        }
      };
      
      await db.collection('vectormonitoring').replaceOne(
        { _id: 'monitoring_config' },
        monitoringConfig,
        { upsert: true }
      );
      
      this.results.success.push('Monitoring configuration completed');
      
    } catch (error) {
      throw new Error(`Monitoring setup failed: ${error.message}`);
    }
  }
  
  /**
   * Step 8: Validate Setup
   */
  async validateSetup() {
    try {
      // Perform comprehensive validation
      const health = await vectorDatabase.healthCheck();
      
      if (health.status !== 'healthy') {
        throw new Error(`Health check failed: ${health.error}`);
      }
      
      // Validate indexes
      const collection = vectorDatabase.collection;
      const indexes = await collection.indexes();
      
      const requiredIndexes = [
        'team_site_source_status_idx',
        'team_time_status_idx',
        'source_metadata_idx',
        'content_text_idx',
        'ttl_expiration_idx'
      ];
      
      const missingIndexes = requiredIndexes.filter(
        indexName => !indexes.some(idx => idx.name === indexName)
      );
      
      if (missingIndexes.length > 0) {
        throw new Error(`Missing required indexes: ${missingIndexes.join(', ')}`);
      }
      
      // Validate vector search index (if available)
      try {
        const searchIndexes = await collection.listSearchIndexes().toArray();
        const vectorIndexExists = searchIndexes.some(idx => idx.name === 'vector_index');
        
        if (!vectorIndexExists) {
          this.results.warnings.push('Vector search index not found - manual creation required in Atlas UI');
        } else {
          this.results.success.push('Vector search index validated');
        }
      } catch (error) {
        this.results.warnings.push('Vector search index validation skipped - Atlas required');
      }
      
      this.results.success.push('Setup validation completed successfully');
      
    } catch (error) {
      throw new Error(`Setup validation failed: ${error.message}`);
    }
  }
  
  /**
   * Step 9: Performance Test
   */
  async performanceTest() {
    try {
      const collection = vectorDatabase.collection;
      
      // Test document insertion
      const testDoc = {
        documentId: 'test_doc_' + Date.now(),
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId(),
        siteId: 'test_site',
        teamId: new mongoose.Types.ObjectId(),
        embedding: Array(1536).fill(0).map(() => Math.random()),
        content: 'Test document for performance validation',
        status: 'active',
        metadata: {
          dataType: 'test',
          importance: 5
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert test document
      const insertStart = Date.now();
      const insertResult = await collection.insertOne(testDoc);
      const insertTime = Date.now() - insertStart;
      
      if (insertTime > 1000) {
        this.results.warnings.push(`Insert performance: ${insertTime}ms (expected < 1000ms)`);
      } else {
        this.results.success.push(`Insert performance: ${insertTime}ms`);
      }
      
      // Test query performance
      const queryStart = Date.now();
      const queryResult = await collection.findOne({ documentId: testDoc.documentId });
      const queryTime = Date.now() - queryStart;
      
      if (queryTime > 100) {
        this.results.warnings.push(`Query performance: ${queryTime}ms (expected < 100ms)`);
      } else {
        this.results.success.push(`Query performance: ${queryTime}ms`);
      }
      
      // Test index usage
      const explainResult = await collection.find({ documentId: testDoc.documentId }).explain('executionStats');
      const indexUsed = explainResult.executionStats.executionStages.stage === 'IXSCAN';
      
      if (!indexUsed) {
        this.results.warnings.push('Query not using index - performance may be suboptimal');
      } else {
        this.results.success.push('Query using index efficiently');
      }
      
      // Clean up test document
      await collection.deleteOne({ _id: insertResult.insertedId });
      
      this.results.success.push('Performance test completed');
      
    } catch (error) {
      throw new Error(`Performance test failed: ${error.message}`);
    }
  }
  
  /**
   * Print setup summary
   */
  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VECTOR DATABASE SETUP SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n✅ SUCCESS (${this.results.success.length}):`);
    this.results.success.forEach(msg => console.log(`   • ${msg}`));
    
    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${this.results.warnings.length}):`);
      this.results.warnings.forEach(msg => console.log(`   • ${msg}`));
    }
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ ERRORS (${this.results.errors.length}):`);
      this.results.errors.forEach(msg => console.log(`   • ${msg}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.results.errors.length === 0) {
      console.log('🎉 Vector Database Setup Completed Successfully!');
      console.log('\nNext Steps:');
      console.log('1. Create Vector Search Index in MongoDB Atlas UI');
      console.log('2. Configure backup automation');
      console.log('3. Set up monitoring alerts');
      console.log('4. Run integration tests');
    } else {
      console.log('❌ Setup completed with errors - please review and fix');
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Atlas Vector Search Index Creation Guide
function printAtlasInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ATLAS VECTOR SEARCH INDEX CREATION');
  console.log('='.repeat(60));
  console.log('\nTo complete the setup, create a Vector Search Index in MongoDB Atlas:');
  console.log('\n1. Go to MongoDB Atlas Dashboard');
  console.log('2. Navigate to your cluster');
  console.log('3. Click "Search" tab');
  console.log('4. Click "Create Search Index"');
  console.log('5. Select "Vector Search"');
  console.log('6. Use the following configuration:');
  console.log('\n```json');
  console.log(JSON.stringify({
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
  }, null, 2));
  console.log('```');
  console.log('\n7. Name the index: "vector_index"');
  console.log('8. Select collection: "vectordocuments"');
  console.log('9. Click "Create Search Index"');
  console.log('\n⏳ Index creation may take 5-10 minutes');
  console.log('='.repeat(60) + '\n');
}

// Main execution
async function main() {
  const setup = new VectorDatabaseSetup();
  
  try {
    await setup.run();
    printAtlasInstructions();
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  } finally {
    await vectorDatabase.shutdown();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { VectorDatabaseSetup }; 