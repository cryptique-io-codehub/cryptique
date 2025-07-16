#!/usr/bin/env node

/**
 * Vector Database Backup and Recovery Script
 * 
 * Provides comprehensive backup and recovery capabilities for the vector database
 * including automated scheduling, compression, encryption, and monitoring.
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');
const { createGzip, createGunzip } = require('zlib');
const { createCipher, createDecipher } = require('crypto');
const { pipeline } = require('stream/promises');
const { vectorDatabase } = require('../config/vectorDatabase');
const logger = require('../config/logger');

class VectorBackupRestore {
  constructor(options = {}) {
    this.config = {
      // Backup configuration
      backupDir: options.backupDir || path.join(__dirname, '../backups/vector'),
      tempDir: options.tempDir || path.join(__dirname, '../temp/vector'),
      
      // Compression and encryption
      compression: options.compression !== false,
      encryption: options.encryption !== false,
      encryptionKey: options.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-in-production',
      
      // Retention settings
      retention: {
        full: options.fullBackupRetention || 4, // Keep 4 full backups
        incremental: options.incrementalBackupRetention || 7, // Keep 7 incremental backups
        maxAge: options.maxBackupAge || 30 * 24 * 60 * 60 * 1000 // 30 days
      },
      
      // Backup schedule
      schedule: {
        full: options.fullBackupSchedule || '0 2 * * 0', // Weekly on Sunday at 2 AM
        incremental: options.incrementalBackupSchedule || '0 2 * * 1-6' // Daily at 2 AM
      },
      
      // Performance settings
      batchSize: options.batchSize || 1000,
      parallelStreams: options.parallelStreams || 3,
      
      // Monitoring
      monitoring: {
        enabled: options.monitoring !== false,
        webhookUrl: options.webhookUrl || process.env.BACKUP_WEBHOOK_URL,
        alertOnFailure: options.alertOnFailure !== false
      },
      
      // Cloud storage (optional)
      cloudStorage: {
        enabled: options.cloudStorage || false,
        provider: options.cloudProvider || 'aws', // aws, gcp, azure
        bucket: options.cloudBucket || process.env.BACKUP_BUCKET,
        region: options.cloudRegion || process.env.BACKUP_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
      }
    };
    
    // State management
    this.isRunning = false;
    this.currentBackup = null;
    this.backupHistory = [];
    this.scheduledJobs = [];
    
    // Statistics
    this.stats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalDataBackedUp: 0,
      averageBackupTime: 0,
      lastBackupTime: null,
      nextScheduledBackup: null
    };
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize backup system
   */
  async initialize() {
    try {
      // Create backup directories
      await this.createDirectories();
      
      // Load backup history
      await this.loadBackupHistory();
      
      // Initialize cloud storage if enabled
      if (this.config.cloudStorage.enabled) {
        await this.initializeCloudStorage();
      }
      
      // Set up monitoring
      if (this.config.monitoring.enabled) {
        this.setupMonitoring();
      }
      
      this.log('info', 'Vector backup system initialized');
      
    } catch (error) {
      this.log('error', 'Failed to initialize backup system', error);
      throw error;
    }
  }
  
  /**
   * Create a full backup
   */
  async createFullBackup(options = {}) {
    const backupId = `full_${Date.now()}`;
    const timestamp = new Date();
    
    try {
      this.log('info', `Starting full backup: ${backupId}`);
      
      this.currentBackup = {
        id: backupId,
        type: 'full',
        status: 'running',
        startTime: timestamp,
        collections: ['vectordocuments', 'embeddingjobs', 'embeddingstats'],
        progress: 0,
        totalDocuments: 0,
        processedDocuments: 0,
        size: 0,
        error: null
      };
      
      // Get total document count
      const totalDocs = await this.getTotalDocumentCount();
      this.currentBackup.totalDocuments = totalDocs;
      
      // Create backup directory
      const backupPath = path.join(this.config.backupDir, backupId);
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup each collection
      const collections = this.currentBackup.collections;
      let totalSize = 0;
      
      for (const collectionName of collections) {
        this.log('info', `Backing up collection: ${collectionName}`);
        
        const collectionPath = path.join(backupPath, `${collectionName}.json`);
        const size = await this.backupCollection(collectionName, collectionPath);
        totalSize += size;
        
        this.log('info', `Collection ${collectionName} backed up: ${this.formatBytes(size)}`);
      }
      
      // Create metadata file
      const metadata = {
        ...this.currentBackup,
        endTime: new Date(),
        size: totalSize,
        status: 'completed'
      };
      
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Compress backup if enabled
      if (this.config.compression) {
        await this.compressBackup(backupPath);
      }
      
      // Encrypt backup if enabled
      if (this.config.encryption) {
        await this.encryptBackup(backupPath);
      }
      
      // Upload to cloud storage if enabled
      if (this.config.cloudStorage.enabled) {
        await this.uploadToCloud(backupPath);
      }
      
      // Update statistics
      this.updateStats(metadata);
      
      // Clean up old backups
      await this.cleanupOldBackups('full');
      
      this.log('info', `Full backup completed: ${backupId} (${this.formatBytes(totalSize)})`);
      
      // Send success notification
      await this.sendNotification('backup_success', metadata);
      
      return metadata;
      
    } catch (error) {
      this.log('error', `Full backup failed: ${backupId}`, error);
      
      if (this.currentBackup) {
        this.currentBackup.status = 'failed';
        this.currentBackup.error = error.message;
        this.currentBackup.endTime = new Date();
      }
      
      // Send failure notification
      await this.sendNotification('backup_failure', {
        backupId,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    } finally {
      this.currentBackup = null;
    }
  }
  
  /**
   * Create an incremental backup
   */
  async createIncrementalBackup(options = {}) {
    const backupId = `incremental_${Date.now()}`;
    const timestamp = new Date();
    
    try {
      this.log('info', `Starting incremental backup: ${backupId}`);
      
      // Find last backup timestamp
      const lastBackup = this.getLastBackup();
      const since = lastBackup ? new Date(lastBackup.endTime) : new Date(0);
      
      this.currentBackup = {
        id: backupId,
        type: 'incremental',
        status: 'running',
        startTime: timestamp,
        since: since,
        collections: ['vectordocuments', 'embeddingjobs', 'embeddingstats'],
        progress: 0,
        totalDocuments: 0,
        processedDocuments: 0,
        size: 0,
        error: null
      };
      
      // Get changed documents count
      const totalDocs = await this.getChangedDocumentCount(since);
      this.currentBackup.totalDocuments = totalDocs;
      
      if (totalDocs === 0) {
        this.log('info', 'No changes since last backup, skipping incremental backup');
        return null;
      }
      
      // Create backup directory
      const backupPath = path.join(this.config.backupDir, backupId);
      await fs.mkdir(backupPath, { recursive: true });
      
      // Backup changed documents from each collection
      const collections = this.currentBackup.collections;
      let totalSize = 0;
      
      for (const collectionName of collections) {
        this.log('info', `Backing up changed documents from: ${collectionName}`);
        
        const collectionPath = path.join(backupPath, `${collectionName}.json`);
        const size = await this.backupChangedDocuments(collectionName, collectionPath, since);
        totalSize += size;
        
        this.log('info', `Collection ${collectionName} incremental backup: ${this.formatBytes(size)}`);
      }
      
      // Create metadata file
      const metadata = {
        ...this.currentBackup,
        endTime: new Date(),
        size: totalSize,
        status: 'completed'
      };
      
      await fs.writeFile(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // Compress and encrypt if enabled
      if (this.config.compression) {
        await this.compressBackup(backupPath);
      }
      
      if (this.config.encryption) {
        await this.encryptBackup(backupPath);
      }
      
      // Upload to cloud storage if enabled
      if (this.config.cloudStorage.enabled) {
        await this.uploadToCloud(backupPath);
      }
      
      // Update statistics
      this.updateStats(metadata);
      
      // Clean up old backups
      await this.cleanupOldBackups('incremental');
      
      this.log('info', `Incremental backup completed: ${backupId} (${this.formatBytes(totalSize)})`);
      
      // Send success notification
      await this.sendNotification('backup_success', metadata);
      
      return metadata;
      
    } catch (error) {
      this.log('error', `Incremental backup failed: ${backupId}`, error);
      
      if (this.currentBackup) {
        this.currentBackup.status = 'failed';
        this.currentBackup.error = error.message;
        this.currentBackup.endTime = new Date();
      }
      
      // Send failure notification
      await this.sendNotification('backup_failure', {
        backupId,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    } finally {
      this.currentBackup = null;
    }
  }
  
  /**
   * Restore from backup
   */
  async restoreFromBackup(backupId, options = {}) {
    try {
      this.log('info', `Starting restore from backup: ${backupId}`);
      
      // Find backup
      const backup = await this.findBackup(backupId);
      if (!backup) {
        throw new Error(`Backup not found: ${backupId}`);
      }
      
      // Validate backup integrity
      await this.validateBackup(backup);
      
      // Create restore point
      const restorePoint = await this.createRestorePoint();
      
      try {
        // Decrypt backup if encrypted
        if (this.config.encryption && backup.encrypted) {
          await this.decryptBackup(backup.path);
        }
        
        // Decompress backup if compressed
        if (this.config.compression && backup.compressed) {
          await this.decompressBackup(backup.path);
        }
        
        // Restore collections
        for (const collectionName of backup.collections) {
          this.log('info', `Restoring collection: ${collectionName}`);
          
          const collectionPath = path.join(backup.path, `${collectionName}.json`);
          await this.restoreCollection(collectionName, collectionPath, options);
          
          this.log('info', `Collection ${collectionName} restored successfully`);
        }
        
        // Rebuild indexes
        await this.rebuildIndexes();
        
        // Validate restore
        await this.validateRestore(backup);
        
        this.log('info', `Restore completed successfully: ${backupId}`);
        
        // Send success notification
        await this.sendNotification('restore_success', {
          backupId,
          timestamp: new Date()
        });
        
        return {
          success: true,
          backupId,
          restorePoint: restorePoint.id,
          timestamp: new Date()
        };
        
      } catch (restoreError) {
        this.log('error', 'Restore failed, rolling back to restore point', restoreError);
        
        // Rollback to restore point
        await this.rollbackToRestorePoint(restorePoint);
        
        throw restoreError;
      }
      
    } catch (error) {
      this.log('error', `Restore failed: ${backupId}`, error);
      
      // Send failure notification
      await this.sendNotification('restore_failure', {
        backupId,
        error: error.message,
        timestamp: new Date()
      });
      
      throw error;
    }
  }
  
  /**
   * List available backups
   */
  async listBackups(options = {}) {
    try {
      const backups = [];
      const backupDir = this.config.backupDir;
      
      // Check if backup directory exists
      try {
        await fs.access(backupDir);
      } catch (error) {
        return backups;
      }
      
      // Read backup directories
      const entries = await fs.readdir(backupDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const metadataPath = path.join(backupDir, entry.name, 'metadata.json');
          
          try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            
            backups.push({
              id: metadata.id,
              type: metadata.type,
              status: metadata.status,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              size: metadata.size,
              collections: metadata.collections,
              path: path.join(backupDir, entry.name)
            });
          } catch (error) {
            this.log('warn', `Failed to read backup metadata: ${entry.name}`, error);
          }
        }
      }
      
      // Sort by creation time (newest first)
      backups.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
      
      // Apply filters
      if (options.type) {
        return backups.filter(backup => backup.type === options.type);
      }
      
      if (options.limit) {
        return backups.slice(0, options.limit);
      }
      
      return backups;
      
    } catch (error) {
      this.log('error', 'Failed to list backups', error);
      throw error;
    }
  }
  
  /**
   * Get backup status and statistics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentBackup: this.currentBackup,
      stats: this.stats,
      nextScheduledBackup: this.stats.nextScheduledBackup,
      config: {
        backupDir: this.config.backupDir,
        compression: this.config.compression,
        encryption: this.config.encryption,
        cloudStorage: this.config.cloudStorage.enabled,
        retention: this.config.retention
      }
    };
  }
  
  // ==================== HELPER METHODS ====================
  
  /**
   * Backup a single collection
   */
  async backupCollection(collectionName, outputPath) {
    const collection = vectorDatabase.db.collection(collectionName);
    const writeStream = require('fs').createWriteStream(outputPath);
    
    let totalSize = 0;
    let processedDocs = 0;
    
    // Create cursor for batch processing
    const cursor = collection.find({}).batchSize(this.config.batchSize);
    
    writeStream.write('[\n');
    
    let isFirst = true;
    
    for await (const doc of cursor) {
      if (!isFirst) {
        writeStream.write(',\n');
      }
      
      const docJson = JSON.stringify(doc);
      writeStream.write(docJson);
      totalSize += docJson.length;
      processedDocs++;
      
      // Update progress
      if (this.currentBackup) {
        this.currentBackup.processedDocuments = processedDocs;
        this.currentBackup.progress = Math.round((processedDocs / this.currentBackup.totalDocuments) * 100);
      }
      
      isFirst = false;
    }
    
    writeStream.write('\n]');
    writeStream.end();
    
    return totalSize;
  }
  
  /**
   * Backup changed documents since a timestamp
   */
  async backupChangedDocuments(collectionName, outputPath, since) {
    const collection = vectorDatabase.db.collection(collectionName);
    const writeStream = require('fs').createWriteStream(outputPath);
    
    let totalSize = 0;
    let processedDocs = 0;
    
    // Query for changed documents
    const query = {
      $or: [
        { createdAt: { $gte: since } },
        { updatedAt: { $gte: since } }
      ]
    };
    
    const cursor = collection.find(query).batchSize(this.config.batchSize);
    
    writeStream.write('[\n');
    
    let isFirst = true;
    
    for await (const doc of cursor) {
      if (!isFirst) {
        writeStream.write(',\n');
      }
      
      const docJson = JSON.stringify(doc);
      writeStream.write(docJson);
      totalSize += docJson.length;
      processedDocs++;
      
      // Update progress
      if (this.currentBackup) {
        this.currentBackup.processedDocuments = processedDocs;
        this.currentBackup.progress = Math.round((processedDocs / this.currentBackup.totalDocuments) * 100);
      }
      
      isFirst = false;
    }
    
    writeStream.write('\n]');
    writeStream.end();
    
    return totalSize;
  }
  
  /**
   * Restore a collection from backup
   */
  async restoreCollection(collectionName, inputPath, options = {}) {
    const collection = vectorDatabase.db.collection(collectionName);
    
    // Read backup file
    const backupContent = await fs.readFile(inputPath, 'utf8');
    const documents = JSON.parse(backupContent);
    
    if (documents.length === 0) {
      return;
    }
    
    // Clear existing collection if requested
    if (options.clearExisting) {
      await collection.deleteMany({});
    }
    
    // Insert documents in batches
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      
      try {
        await collection.insertMany(batch, { ordered: false });
      } catch (error) {
        // Handle duplicate key errors for partial restores
        if (error.code !== 11000) {
          throw error;
        }
      }
    }
  }
  
  /**
   * Compress backup directory
   */
  async compressBackup(backupPath) {
    const compressedPath = `${backupPath}.tar.gz`;
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', compressedPath, '-C', path.dirname(backupPath), path.basename(backupPath)]);
      
      tar.on('close', (code) => {
        if (code === 0) {
          // Remove original directory
          fs.rmdir(backupPath, { recursive: true })
            .then(() => resolve(compressedPath))
            .catch(reject);
        } else {
          reject(new Error(`Compression failed with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }
  
  /**
   * Decompress backup
   */
  async decompressBackup(compressedPath) {
    const extractPath = compressedPath.replace('.tar.gz', '');
    
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-xzf', compressedPath, '-C', path.dirname(compressedPath)]);
      
      tar.on('close', (code) => {
        if (code === 0) {
          resolve(extractPath);
        } else {
          reject(new Error(`Decompression failed with code ${code}`));
        }
      });
      
      tar.on('error', reject);
    });
  }
  
  /**
   * Get total document count
   */
  async getTotalDocumentCount() {
    let total = 0;
    const collections = ['vectordocuments', 'embeddingjobs', 'embeddingstats'];
    
    for (const collectionName of collections) {
      const collection = vectorDatabase.db.collection(collectionName);
      const count = await collection.countDocuments();
      total += count;
    }
    
    return total;
  }
  
  /**
   * Get changed document count since timestamp
   */
  async getChangedDocumentCount(since) {
    let total = 0;
    const collections = ['vectordocuments', 'embeddingjobs', 'embeddingstats'];
    
    for (const collectionName of collections) {
      const collection = vectorDatabase.db.collection(collectionName);
      const query = {
        $or: [
          { createdAt: { $gte: since } },
          { updatedAt: { $gte: since } }
        ]
      };
      const count = await collection.countDocuments(query);
      total += count;
    }
    
    return total;
  }
  
  /**
   * Create directories
   */
  async createDirectories() {
    await fs.mkdir(this.config.backupDir, { recursive: true });
    await fs.mkdir(this.config.tempDir, { recursive: true });
  }
  
  /**
   * Load backup history
   */
  async loadBackupHistory() {
    try {
      const historyPath = path.join(this.config.backupDir, 'backup_history.json');
      const historyContent = await fs.readFile(historyPath, 'utf8');
      this.backupHistory = JSON.parse(historyContent);
    } catch (error) {
      // History file doesn't exist, start with empty history
      this.backupHistory = [];
    }
  }
  
  /**
   * Save backup history
   */
  async saveBackupHistory() {
    const historyPath = path.join(this.config.backupDir, 'backup_history.json');
    await fs.writeFile(historyPath, JSON.stringify(this.backupHistory, null, 2));
  }
  
  /**
   * Update statistics
   */
  updateStats(backup) {
    this.stats.totalBackups++;
    
    if (backup.status === 'completed') {
      this.stats.successfulBackups++;
      this.stats.totalDataBackedUp += backup.size;
      
      const backupTime = new Date(backup.endTime) - new Date(backup.startTime);
      this.stats.averageBackupTime = (this.stats.averageBackupTime * (this.stats.successfulBackups - 1) + backupTime) / this.stats.successfulBackups;
    } else {
      this.stats.failedBackups++;
    }
    
    this.stats.lastBackupTime = backup.endTime;
    
    // Add to history
    this.backupHistory.push(backup);
    this.saveBackupHistory();
  }
  
  /**
   * Clean up old backups
   */
  async cleanupOldBackups(type) {
    const backups = await this.listBackups({ type });
    const retention = this.config.retention[type];
    
    if (backups.length > retention) {
      const toDelete = backups.slice(retention);
      
      for (const backup of toDelete) {
        try {
          await fs.rmdir(backup.path, { recursive: true });
          this.log('info', `Deleted old backup: ${backup.id}`);
        } catch (error) {
          this.log('warn', `Failed to delete old backup: ${backup.id}`, error);
        }
      }
    }
  }
  
  /**
   * Send notification
   */
  async sendNotification(type, data) {
    if (!this.config.monitoring.enabled || !this.config.monitoring.webhookUrl) {
      return;
    }
    
    try {
      const axios = require('axios');
      
      const message = {
        type,
        data,
        timestamp: new Date().toISOString(),
        service: 'vector-backup'
      };
      
      await axios.post(this.config.monitoring.webhookUrl, message, {
        timeout: 5000
      });
      
    } catch (error) {
      this.log('error', 'Failed to send notification', error);
    }
  }
  
  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Get last backup
   */
  getLastBackup() {
    return this.backupHistory.length > 0 ? this.backupHistory[this.backupHistory.length - 1] : null;
  }
  
  /**
   * Log messages
   */
  log(level, message, extra = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: 'VectorBackup',
      message,
      ...(extra && { extra })
    };
    
    if (logger && logger[level]) {
      logger[level](message, extra);
    } else {
      console[level]?.(JSON.stringify(logEntry));
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Initialize vector database connection
  await vectorDatabase.initialize();
  
  const backup = new VectorBackupRestore();
  
  try {
    switch (command) {
      case 'full':
        await backup.createFullBackup();
        break;
        
      case 'incremental':
        await backup.createIncrementalBackup();
        break;
        
      case 'restore':
        const backupId = args[1];
        if (!backupId) {
          console.error('Usage: node vectorBackupRestore.js restore <backup-id>');
          process.exit(1);
        }
        await backup.restoreFromBackup(backupId);
        break;
        
      case 'list':
        const backups = await backup.listBackups();
        console.table(backups.map(b => ({
          ID: b.id,
          Type: b.type,
          Status: b.status,
          Size: backup.formatBytes(b.size),
          Date: new Date(b.startTime).toLocaleString()
        })));
        break;
        
      case 'status':
        const status = backup.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      default:
        console.log('Usage: node vectorBackupRestore.js <command>');
        console.log('Commands:');
        console.log('  full                 - Create full backup');
        console.log('  incremental          - Create incremental backup');
        console.log('  restore <backup-id>  - Restore from backup');
        console.log('  list                 - List available backups');
        console.log('  status               - Show backup system status');
        break;
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { VectorBackupRestore }; 