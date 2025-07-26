#!/usr/bin/env node

/**
 * Vector Store Backup Script
 * Backs up vector documents and related data from MongoDB
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const VectorDocument = require('../models/vectorDocument');
const EmbeddingJob = require('../models/embeddingJob');
const EmbeddingStats = require('../models/embeddingStats');

class VectorBackup {
  constructor(backupDir) {
    this.backupDir = backupDir;
    this.startTime = Date.now();
    this.stats = {
      vectorDocuments: 0,
      embeddingJobs: 0,
      embeddingStats: 0,
      totalSize: 0,
      errors: 0
    };
  }

  /**
   * Initialize backup process
   */
  async initialize() {
    try {
      // Create backup directory
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB for vector backup');

      return true;
    } catch (error) {
      console.error('Failed to initialize vector backup:', error);
      return false;
    }
  }

  /**
   * Backup vector documents
   */
  async backupVectorDocuments() {
    try {
      console.log('Backing up vector documents...');
      
      const outputFile = path.join(this.backupDir, 'vector_documents.json');
      const writeStream = fs.createWriteStream(outputFile);
      
      writeStream.write('[\n');
      
      let isFirst = true;
      let count = 0;
      
      // Stream documents to avoid memory issues
      const cursor = VectorDocument.find({}).cursor();
      
      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        if (!isFirst) {
          writeStream.write(',\n');
        }
        
        // Convert to plain object and remove sensitive data
        const docObj = doc.toObject();
        
        // Optionally compress embedding vectors for storage
        if (docObj.embedding && Array.isArray(docObj.embedding)) {
          docObj.embeddingLength = docObj.embedding.length;
          // Store first few dimensions for verification
          docObj.embeddingSample = docObj.embedding.slice(0, 10);
          // Remove full embedding to save space (can be regenerated)
          delete docObj.embedding;
        }
        
        writeStream.write(JSON.stringify(docObj, null, 2));
        
        count++;
        isFirst = false;
        
        if (count % 1000 === 0) {
          console.log(`Backed up ${count} vector documents...`);
        }
      }
      
      writeStream.write('\n]');
      writeStream.end();
      
      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
      
      this.stats.vectorDocuments = count;
      console.log(`Vector documents backup completed: ${count} documents`);
      
      return true;
    } catch (error) {
      console.error('Error backing up vector documents:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Backup embedding jobs
   */
  async backupEmbeddingJobs() {
    try {
      console.log('Backing up embedding jobs...');
      
      const outputFile = path.join(this.backupDir, 'embedding_jobs.json');
      const jobs = await EmbeddingJob.find({}).lean();
      
      fs.writeFileSync(outputFile, JSON.stringify(jobs, null, 2));
      
      this.stats.embeddingJobs = jobs.length;
      console.log(`Embedding jobs backup completed: ${jobs.length} jobs`);
      
      return true;
    } catch (error) {
      console.error('Error backing up embedding jobs:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Backup embedding statistics
   */
  async backupEmbeddingStats() {
    try {
      console.log('Backing up embedding statistics...');
      
      const outputFile = path.join(this.backupDir, 'embedding_stats.json');
      const stats = await EmbeddingStats.find({}).lean();
      
      fs.writeFileSync(outputFile, JSON.stringify(stats, null, 2));
      
      this.stats.embeddingStats = stats.length;
      console.log(`Embedding stats backup completed: ${stats.length} records`);
      
      return true;
    } catch (error) {
      console.error('Error backing up embedding stats:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Backup metadata and configuration
   */
  async backupMetadata() {
    try {
      console.log('Backing up metadata...');
      
      const metadata = {
        backupTimestamp: new Date().toISOString(),
        backupVersion: '1.0.0',
        mongodbUri: process.env.MONGODB_URI ? 'configured' : 'not_configured',
        collections: {
          vectorDocuments: await VectorDocument.countDocuments(),
          embeddingJobs: await EmbeddingJob.countDocuments(),
          embeddingStats: await EmbeddingStats.countDocuments()
        },
        indexes: {
          vectorDocuments: await this.getCollectionIndexes('vectordocuments'),
          embeddingJobs: await this.getCollectionIndexes('embeddingjobs'),
          embeddingStats: await this.getCollectionIndexes('embeddingstats')
        },
        configuration: {
          embeddingDimensions: 1536, // Gemini embedding dimensions
          chunkSizeDefault: 1000,
          overlapDefault: 200
        }
      };
      
      const outputFile = path.join(this.backupDir, 'metadata.json');
      fs.writeFileSync(outputFile, JSON.stringify(metadata, null, 2));
      
      console.log('Metadata backup completed');
      return true;
    } catch (error) {
      console.error('Error backing up metadata:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get collection indexes
   */
  async getCollectionIndexes(collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      return indexes;
    } catch (error) {
      console.warn(`Could not get indexes for ${collectionName}:`, error.message);
      return [];
    }
  }

  /**
   * Calculate backup statistics
   */
  calculateStats() {
    try {
      const files = fs.readdirSync(this.backupDir);
      let totalSize = 0;
      
      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
      });
      
      this.stats.totalSize = totalSize;
      this.stats.totalSizeMB = Math.round(totalSize / 1024 / 1024 * 100) / 100;
      
    } catch (error) {
      console.warn('Could not calculate backup size:', error.message);
    }
  }

  /**
   * Generate backup report
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: {
        seconds: Math.round(duration / 1000),
        milliseconds: duration
      },
      statistics: this.stats,
      status: this.stats.errors === 0 ? 'success' : 'partial_success',
      files: fs.readdirSync(this.backupDir)
    };
    
    const reportFile = path.join(this.backupDir, 'backup_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n=== Vector Backup Report ===');
    console.log(`Status: ${report.status}`);
    console.log(`Duration: ${report.duration.seconds}s`);
    console.log(`Vector Documents: ${this.stats.vectorDocuments}`);
    console.log(`Embedding Jobs: ${this.stats.embeddingJobs}`);
    console.log(`Embedding Stats: ${this.stats.embeddingStats}`);
    console.log(`Total Size: ${this.stats.totalSizeMB || 0}MB`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Report saved: ${reportFile}`);
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.warn('Error during cleanup:', error.message);
    }
  }

  /**
   * Run complete backup process
   */
  async run() {
    try {
      console.log('=== Starting Vector Store Backup ===');
      console.log(`Backup directory: ${this.backupDir}`);
      
      // Initialize
      const initialized = await this.initialize();
      if (!initialized) {
        process.exit(1);
      }
      
      // Perform backups
      await this.backupVectorDocuments();
      await this.backupEmbeddingJobs();
      await this.backupEmbeddingStats();
      await this.backupMetadata();
      
      // Calculate statistics
      this.calculateStats();
      
      // Generate report
      this.generateReport();
      
      // Cleanup
      await this.cleanup();
      
      if (this.stats.errors === 0) {
        console.log('\n✅ Vector backup completed successfully');
        process.exit(0);
      } else {
        console.log(`\n⚠️  Vector backup completed with ${this.stats.errors} errors`);
        process.exit(1);
      }
      
    } catch (error) {
      console.error('Fatal error during vector backup:', error);
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Main execution
if (require.main === module) {
  const backupDir = process.argv[2];
  
  if (!backupDir) {
    console.error('Usage: node backup-vectors.js <backup_directory>');
    process.exit(1);
  }
  
  const backup = new VectorBackup(backupDir);
  backup.run();
}

module.exports = VectorBackup; 