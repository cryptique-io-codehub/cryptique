#!/usr/bin/env node

/**
 * Vector Database Infrastructure Test Runner
 * 
 * This script validates the complete vector database setup including:
 * - Database connections and configuration
 * - Model schemas and validation
 * - Index creation and performance
 * - Service initialization and health checks
 * - Integration between components
 */

const mongoose = require('mongoose');
const { performance } = require('perf_hooks');

// Import models and services
const VectorDocument = require('../models/vectorDocument');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');

// Configuration
const CONFIG = {
  TEST_DB_URI: process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/cryptique-vector-test',
  VERBOSE: process.env.VERBOSE === 'true',
  CLEANUP: process.env.CLEANUP !== 'false'
};

class VectorInfrastructureValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
    this.startTime = performance.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[34m',    // Blue
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    const color = colors[type] || '';
    console.log(`${color}${message}${colors.reset}`);
    
    if (CONFIG.VERBOSE || type !== 'debug') {
      this.results.details.push({ timestamp, message, type });
    }
  }

  async test(description, testFn) {
    try {
      this.log(`Testing: ${description}`, 'debug');
      const startTime = performance.now();
      
      await testFn();
      
      const duration = Math.round(performance.now() - startTime);
      this.log(`✓ ${description} (${duration}ms)`, 'success');
      this.results.passed++;
      
      return true;
    } catch (error) {
      this.log(`✗ ${description}: ${error.message}`, 'error');
      this.results.failed++;
      
      if (CONFIG.VERBOSE) {
        console.error(error.stack);
      }
      
      return false;
    }
  }

  warn(message) {
    this.log(`⚠ ${message}`, 'warning');
    this.results.warnings++;
  }

  async validateDatabaseConnection() {
    await this.test('Database connection establishment', async () => {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(CONFIG.TEST_DB_URI, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          maxPoolSize: 10,
          minPoolSize: 2,
          connectTimeoutMS: 10000,
          socketTimeoutMS: 45000
        });
      }
      
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Failed to establish database connection');
      }
    });

    await this.test('Connection pool configuration', async () => {
      const db = mongoose.connection.db;
      const admin = db.admin();
      
      // Check if connection is working by getting server status
      const status = await admin.serverStatus();
      if (!status || !status.ok) {
        throw new Error('Database connection not healthy');
      }
      
      // Check connection state
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database not in connected state');
      }
    });

    await this.test('Database write operations', async () => {
      const testDoc = new VectorDocument({
        documentId: 'connection-test-' + Date.now(),
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId(),
        siteId: 'test-site',
        teamId: new mongoose.Types.ObjectId(),
        embedding: new Array(1536).fill(0.1),
        content: 'Connection test document'
      });
      
      const saved = await testDoc.save();
      if (!saved._id) {
        throw new Error('Failed to save test document');
      }
      
      await VectorDocument.findByIdAndDelete(saved._id);
    });
  }

  async validateVectorDocumentModel() {
    await this.test('VectorDocument schema validation', async () => {
      const validDoc = {
        documentId: 'schema-test-' + Date.now(),
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId(),
        siteId: 'test-site',
        teamId: new mongoose.Types.ObjectId(),
        embedding: new Array(1536).fill(0.2),
        content: 'Schema validation test',
        metadata: {
          dataType: 'metric',
          tags: ['test'],
          importance: 5
        }
      };
      
      const doc = new VectorDocument(validDoc);
      const saved = await doc.save();
      
      if (saved.status !== 'active') {
        throw new Error('Default status not set correctly');
      }
      
      if (saved.version !== 1) {
        throw new Error('Default version not set correctly');
      }
      
      await VectorDocument.findByIdAndDelete(saved._id);
    });

    await this.test('VectorDocument embedding dimension validation', async () => {
      const invalidDoc = {
        documentId: 'invalid-embedding-test',
        sourceType: 'analytics',
        sourceId: new mongoose.Types.ObjectId(),
        siteId: 'test-site',
        teamId: new mongoose.Types.ObjectId(),
        embedding: new Array(512).fill(0.1), // Wrong dimensions
        content: 'Invalid embedding test'
      };
      
      const doc = new VectorDocument(invalidDoc);
      
      try {
        await doc.save();
        throw new Error('Should have failed validation for wrong embedding dimensions');
      } catch (error) {
        if (!error.errors || !error.errors.embedding) {
          throw new Error('Embedding validation not working properly');
        }
      }
    });

    await this.test('VectorDocument required field validation', async () => {
      const incompleteDoc = {
        documentId: 'incomplete-test'
        // Missing required fields
      };
      
      const doc = new VectorDocument(incompleteDoc);
      
      try {
        await doc.save();
        throw new Error('Should have failed validation for missing required fields');
      } catch (error) {
        const requiredFields = ['sourceType', 'sourceId', 'siteId', 'teamId', 'embedding', 'content'];
        
        for (const field of requiredFields) {
          if (!error.errors || !error.errors[field]) {
            throw new Error(`Required field validation missing for: ${field}`);
          }
        }
      }
    });

    await this.test('VectorDocument static methods', async () => {
      const teamId = new mongoose.Types.ObjectId();
      const siteId = 'static-method-test';
      
      // Create test documents
      const docs = [];
      for (let i = 0; i < 3; i++) {
        const doc = await new VectorDocument({
          documentId: `static-test-${i}`,
          sourceType: i === 0 ? 'analytics' : 'transaction',
          sourceId: new mongoose.Types.ObjectId(),
          siteId,
          teamId,
          embedding: new Array(1536).fill(0.1),
          content: `Static method test ${i}`
        }).save();
        docs.push(doc);
      }
      
      // Test findByTeamAndSite
      const teamSiteDocs = await VectorDocument.findByTeamAndSite(teamId, siteId);
      if (teamSiteDocs.length !== 3) {
        throw new Error(`Expected 3 documents, got ${teamSiteDocs.length}`);
      }
      
      // Test findBySourceType
      const analyticsDocs = await VectorDocument.findBySourceType('analytics', teamId);
      if (analyticsDocs.length !== 1) {
        throw new Error(`Expected 1 analytics document, got ${analyticsDocs.length}`);
      }
      
      // Cleanup
      await VectorDocument.deleteMany({ _id: { $in: docs.map(d => d._id) } });
    });
  }

  async validateEmbeddingJobModel() {
    await this.test('EmbeddingJob schema validation', async () => {
      const validJob = {
        jobId: 'job-test-' + Date.now(),
        jobType: 'initial_processing',
        priority: 5,
        sourceType: 'analytics',
        sourceIds: [new mongoose.Types.ObjectId()],
        teamId: new mongoose.Types.ObjectId(),
        progress: {
          total: 100,
          processed: 0,
          failed: 0
        }
      };
      
      const job = new EmbeddingJob(validJob);
      const saved = await job.save();
      
      if (saved.status !== 'pending') {
        throw new Error('Default status not set correctly');
      }
      
      if (saved.progress.percentage !== 0) {
        throw new Error('Progress percentage not calculated correctly');
      }
      
      await EmbeddingJob.findByIdAndDelete(saved._id);
    });

    await this.test('EmbeddingJob progress calculation', async () => {
      const job = new EmbeddingJob({
        jobId: 'progress-test-' + Date.now(),
        jobType: 'initial_processing',
        sourceType: 'analytics',
        sourceIds: [new mongoose.Types.ObjectId()],
        teamId: new mongoose.Types.ObjectId(),
        progress: {
          total: 100,
          processed: 50,
          failed: 5
        }
      });
      
      await job.save();
      
      if (job.progress.percentage !== 50) {
        throw new Error(`Expected 50% progress, got ${job.progress.percentage}%`);
      }
      
      await EmbeddingJob.findByIdAndDelete(job._id);
    });

    await this.test('EmbeddingJob lifecycle methods', async () => {
      const job = await new EmbeddingJob({
        jobId: 'lifecycle-test-' + Date.now(),
        jobType: 'initial_processing',
        sourceType: 'analytics',
        sourceIds: [new mongoose.Types.ObjectId()],
        teamId: new mongoose.Types.ObjectId(),
        progress: { total: 100 }
      }).save();
      
      // Test start
      await job.start();
      if (job.status !== 'processing' || !job.startedAt) {
        throw new Error('Job start method not working correctly');
      }
      
      // Test complete - reload to get fresh state
      const updatedJob = await EmbeddingJob.findById(job._id);
      await updatedJob.complete();
      if (updatedJob.status !== 'completed' || !updatedJob.completedAt || updatedJob.progress.percentage !== 100) {
        throw new Error(`Job complete method not working correctly. Status: ${updatedJob.status}, CompletedAt: ${updatedJob.completedAt}, Percentage: ${updatedJob.progress.percentage}`);
      }
      
      await EmbeddingJob.findByIdAndDelete(job._id);
    });

    await this.test('EmbeddingJob queue management', async () => {
      // Create jobs with different priorities
      const jobs = [];
      const priorities = [3, 8, 5, 1, 9];
      
      for (let i = 0; i < priorities.length; i++) {
        const job = await new EmbeddingJob({
          jobId: `queue-test-${i}`,
          jobType: 'initial_processing',
          priority: priorities[i],
          sourceType: 'analytics',
          sourceIds: [new mongoose.Types.ObjectId()],
          teamId: new mongoose.Types.ObjectId(),
          progress: { total: 10 }
        }).save();
        jobs.push(job);
      }
      
      // Get next job (should be highest priority)
      const nextJob = await EmbeddingJob.getNextJob();
      if (!nextJob || nextJob.priority !== 9) {
        throw new Error('Queue not returning highest priority job');
      }
      
      if (nextJob.status !== 'processing') {
        throw new Error('Job status not updated when retrieved from queue');
      }
      
      // Cleanup
      await EmbeddingJob.deleteMany({ _id: { $in: jobs.map(j => j._id) } });
    });
  }

  async validateEmbeddingStatsModel() {
    await this.test('EmbeddingStats schema validation', async () => {
      const validStats = {
        period: 'daily',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        teamId: new mongoose.Types.ObjectId(),
        processing: {
          jobsCreated: 10,
          jobsCompleted: 8,
          jobsFailed: 2,
          documentsProcessed: 100
        },
        apiUsage: {
          totalApiCalls: 100,
          successfulApiCalls: 95,
          totalTokensUsed: 5000,
          totalCost: 0.50
        }
      };
      
      const stats = new EmbeddingStats(validStats);
      await stats.save();
      
      // Check calculated fields
      if (stats.processing.errorRate !== 20) {
        throw new Error(`Expected 20% error rate, got ${stats.processing.errorRate}%`);
      }
      
      if (stats.apiUsage.apiSuccessRate !== 95) {
        throw new Error(`Expected 95% API success rate, got ${stats.apiUsage.apiSuccessRate}%`);
      }
      
      await EmbeddingStats.findByIdAndDelete(stats._id);
    });

    await this.test('EmbeddingStats unique constraints', async () => {
      const teamId = new mongoose.Types.ObjectId();
      const statsData = {
        period: 'daily',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-02'),
        teamId: teamId
      };
      
      const stats1 = await new EmbeddingStats(statsData).save();
      
      try {
        const stats2 = new EmbeddingStats(statsData);
        await stats2.save();
        // If we get here, the unique constraint didn't work
        await EmbeddingStats.findByIdAndDelete(stats2._id);
        throw new Error('Should have failed unique constraint');
      } catch (error) {
        if (error.code !== 11000 && !error.message.includes('duplicate key')) {
          throw new Error(`Unique constraint not working properly. Error: ${error.message}, Code: ${error.code}`);
        }
        // This is expected - unique constraint worked
      }
      
      await EmbeddingStats.findByIdAndDelete(stats1._id);
    });
  }

  async validateIndexes() {
    await this.test('VectorDocument indexes', async () => {
      const indexes = await VectorDocument.collection.getIndexes();
      
      const expectedIndexes = [
        'documentId_1',
        'sourceType_1',
        'siteId_1',
        'teamId_1',
        'status_1_createdAt_-1',
        'teamId_1_siteId_1_sourceType_1'
      ];
      
      for (const expectedIndex of expectedIndexes) {
        if (!indexes[expectedIndex]) {
          throw new Error(`Missing index: ${expectedIndex}`);
        }
      }
    });

    await this.test('EmbeddingJob indexes', async () => {
      const indexes = await EmbeddingJob.collection.getIndexes();
      
      const expectedIndexes = [
        'jobId_1',
        'status_1_priority_-1_scheduledFor_1',
        'teamId_1_status_1_createdAt_-1'
      ];
      
      for (const expectedIndex of expectedIndexes) {
        if (!indexes[expectedIndex]) {
          throw new Error(`Missing index: ${expectedIndex}`);
        }
      }
    });

    await this.test('Index performance', async () => {
      // Create test data
      const testDocs = [];
      for (let i = 0; i < 100; i++) {
        testDocs.push({
          documentId: `perf-test-${i}`,
          sourceType: 'analytics',
          sourceId: new mongoose.Types.ObjectId(),
          siteId: `site-${i % 10}`,
          teamId: new mongoose.Types.ObjectId(),
          embedding: new Array(1536).fill(Math.random()),
          content: `Performance test document ${i}`
        });
      }
      
      await VectorDocument.insertMany(testDocs);
      
      // Test query performance
      const startTime = performance.now();
      const results = await VectorDocument.find({ 
        sourceType: 'analytics',
        siteId: 'site-1' 
      }).limit(10);
      const queryTime = performance.now() - startTime;
      
      if (queryTime > 100) { // Should complete in under 100ms
        this.warn(`Query took ${Math.round(queryTime)}ms (expected < 100ms)`);
      }
      
      if (results.length === 0) {
        throw new Error('Query returned no results');
      }
      
      // Cleanup
      await VectorDocument.deleteMany({ 
        documentId: { $regex: /^perf-test-/ } 
      });
    });
  }

  async validateEnvironmentConfiguration() {
    await this.test('Environment variables', async () => {
      const requiredEnvVars = ['MONGODB_URI'];
      const optionalEnvVars = ['GEMINI_API_KEY'];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          throw new Error(`Missing required environment variable: ${envVar}`);
        }
      }
      
      for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) {
          this.warn(`Optional environment variable not set: ${envVar}`);
        }
      }
    });

    await this.test('Node.js version compatibility', async () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      
      if (majorVersion < 14) {
        throw new Error(`Node.js version ${nodeVersion} is not supported. Minimum version: 14.x`);
      }
      
      if (majorVersion < 16) {
        this.warn(`Node.js version ${nodeVersion} is supported but not recommended. Consider upgrading to 16.x or later`);
      }
    });
  }

  async validateConcurrency() {
    await this.test('Concurrent operations', async () => {
      const concurrentCount = 20;
      const promises = [];
      
      for (let i = 0; i < concurrentCount; i++) {
        promises.push(
          new VectorDocument({
            documentId: `concurrent-test-${i}`,
            sourceType: 'analytics',
            sourceId: new mongoose.Types.ObjectId(),
            siteId: 'concurrent-test',
            teamId: new mongoose.Types.ObjectId(),
            embedding: new Array(1536).fill(Math.random()),
            content: `Concurrent test document ${i}`
          }).save()
        );
      }
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (successful.length !== concurrentCount) {
        throw new Error(`Only ${successful.length}/${concurrentCount} concurrent operations succeeded`);
      }
      
      if (failed.length > 0) {
        throw new Error(`${failed.length} concurrent operations failed`);
      }
      
      // Cleanup
      await VectorDocument.deleteMany({ 
        documentId: { $regex: /^concurrent-test-/ } 
      });
    });
  }

  async cleanup() {
    if (!CONFIG.CLEANUP) {
      this.log('Skipping cleanup (CLEANUP=false)', 'debug');
      return;
    }

    await this.test('Database cleanup', async () => {
      // Clean up any remaining test data
      await VectorDocument.deleteMany({ 
        documentId: { $regex: /^(test-|schema-|static-|connection-|perf-|concurrent-)/ } 
      });
      
      await EmbeddingJob.deleteMany({ 
        jobId: { $regex: /^(job-test-|progress-test-|lifecycle-test-|queue-test-)/ } 
      });
      
      await EmbeddingStats.deleteMany({ 
        period: 'daily',
        startDate: new Date('2024-01-01') 
      });
    });

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
  }

  generateReport() {
    const duration = Math.round(performance.now() - this.startTime);
    const total = this.results.passed + this.results.failed;
    const successRate = total > 0 ? Math.round((this.results.passed / total) * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('VECTOR DATABASE INFRASTRUCTURE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`${'✓ Passed:'.padEnd(20)} ${this.results.passed}`);
    console.log(`${'✗ Failed:'.padEnd(20)} ${this.results.failed}`);
    console.log(`${'⚠ Warnings:'.padEnd(20)} ${this.results.warnings}`);
    console.log(`${'Success Rate:'.padEnd(20)} ${successRate}%`);
    console.log(`${'Duration:'.padEnd(20)} ${duration}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n' + 'CRITICAL ISSUES FOUND:');
      this.results.details
        .filter(d => d.type === 'error')
        .forEach(d => console.log(`  • ${d.message}`));
    }
    
    if (this.results.warnings > 0) {
      console.log('\n' + 'WARNINGS:');
      this.results.details
        .filter(d => d.type === 'warning')
        .forEach(d => console.log(`  • ${d.message}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    return this.results.failed === 0;
  }

  async run() {
    this.log('Starting Vector Database Infrastructure Validation', 'info');
    this.log(`Test Database: ${CONFIG.TEST_DB_URI}`, 'debug');
    
    try {
      // Core validation tests
      await this.validateEnvironmentConfiguration();
      await this.validateDatabaseConnection();
      await this.validateVectorDocumentModel();
      await this.validateEmbeddingJobModel();
      await this.validateEmbeddingStatsModel();
      await this.validateIndexes();
      await this.validateConcurrency();
      
    } catch (error) {
      this.log(`Unexpected error during validation: ${error.message}`, 'error');
      this.results.failed++;
    } finally {
      await this.cleanup();
    }
    
    const success = this.generateReport();
    process.exit(success ? 0 : 1);
  }
}

// Run the validator if called directly
if (require.main === module) {
  const validator = new VectorInfrastructureValidator();
  validator.run().catch(console.error);
}

module.exports = VectorInfrastructureValidator; 
