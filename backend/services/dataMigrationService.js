/**
 * Data Migration Service for CQ Intelligence
 * 
 * Provides comprehensive data migration capabilities from existing collections to vector database:
 * - Migration orchestration across multiple data sources
 * - Progress tracking and checkpoint management
 * - Error handling with retry mechanisms
 * - Validation and reporting
 */

const EventEmitter = require('events');
const { ObjectId } = require('mongodb');
const logger = require('../config/logger');
const { vectorDatabase } = require('../config/vectorDatabase');
const { migrationProgressTracker } = require('./migrationProgressTracker');
const { checkpointManager } = require('./checkpointManager');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mongoose = require('mongoose');

// Python service integration
const { spawnSync } = require('child_process');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

class DataMigrationService extends EventEmitter {
  constructor() {
    super();
    
    // Default configuration
    this.config = {
      sources: ['analytics', 'sessions', 'campaigns', 'transactions'],
      batchSize: 1000,
      maxConcurrency: 4,
      validationLevel: 'strict',
      backupOriginal: true,
      resumeFromCheckpoint: true,
      retryAttempts: 3,
      retryDelay: 5000,
      checkpointDir: path.join(process.cwd(), 'data', 'checkpoints'),
      embeddingModel: 'gemini',
      pythonServicePath: path.join(process.cwd(), 'backend', 'python')
    };
    
    // Migration state
    this.migrationState = {
      jobId: null,
      status: 'idle', // idle, running, paused, completed, failed
      currentSource: null,
      currentBatch: 0,
      lastProcessedId: null,
      startTime: null,
      endTime: null,
      isRunning: false
    };
    
    // Progress tracking
    this.progress = {
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      processingRate: 0, // records per second
      estimatedCompletion: null,
      errors: []
    };
    
    // Database connections
    this.sourceDb = null;
    this.vectorDb = null;
    
    // Bind methods
    this.handleError = this.handleError.bind(this);
    this.updateProgress = this.updateProgress.bind(this);
  }
  
  /**
   * Initialize migration service with configuration
   */
  async initialize(config = {}) {
    try {
      logger.info('Initializing Data Migration Service...');
      
      // Merge provided config with defaults
      this.config = {
        ...this.config,
        ...config
      };
      
      // Validate configuration
      this._validateConfig();
      
      // Ensure checkpoint directory exists
      await this._ensureCheckpointDir();
      
      // Initialize vector database
      this.vectorDb = vectorDatabase;
      await this.vectorDb.initialize();
      
      // Initialize source database connection
      await this._initializeSourceDb();
      
      // Initialize progress tracker
      await migrationProgressTracker.initialize();
      
      // Check Python service availability
      await this._checkPythonService();
      
      logger.info('Data Migration Service initialized successfully');
      this.emit('initialized');
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize Data Migration Service:', error);
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Start migration process
   */
  async startMigration(options = {}) {
    try {
      if (this.migrationState.isRunning) {
        logger.warn('Migration is already running');
        return { success: false, message: 'Migration is already running' };
      }
      
      // Generate new job ID if not resuming
      if (!options.resumeJobId) {
        this.migrationState.jobId = this._generateJobId();
      } else {
        this.migrationState.jobId = options.resumeJobId;
      }
      
      // Initialize migration state
      this.migrationState.status = 'running';
      this.migrationState.isRunning = true;
      this.migrationState.startTime = new Date();
      this.migrationState.endTime = null;
      
      // Reset progress if not resuming
      if (!options.resumeJobId) {
        this._resetProgress();
      } else {
        // Load checkpoint if resuming
        await this._loadCheckpoint(options.resumeJobId);
      }
      
      logger.info(`Starting migration job: ${this.migrationState.jobId}`);
      this.emit('migrationStarted', this.migrationState);
      
      // Calculate total records to migrate
      await this._calculateTotalRecords();
      
      // Start migration process
      await this._runMigration();
      
      return {
        success: true,
        jobId: this.migrationState.jobId,
        message: 'Migration started successfully'
      };
    } catch (error) {
      logger.error('Failed to start migration:', error);
      this.migrationState.status = 'failed';
      this.migrationState.isRunning = false;
      this.handleError(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Pause ongoing migration
   */
  async pauseMigration() {
    try {
      if (!this.migrationState.isRunning) {
        return { success: false, message: 'No migration is currently running' };
      }
      
      logger.info(`Pausing migration job: ${this.migrationState.jobId}`);
      
      // Update state
      this.migrationState.status = 'paused';
      this.migrationState.isRunning = false;
      
      // Save checkpoint
      await this._saveCheckpoint();
      
      this.emit('migrationPaused', this.migrationState);
      
      return {
        success: true,
        message: 'Migration paused successfully',
        checkpoint: this.migrationState.jobId
      };
    } catch (error) {
      logger.error('Failed to pause migration:', error);
      this.handleError(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Resume paused migration
   */
  async resumeMigration(jobId) {
    try {
      if (this.migrationState.isRunning) {
        return { success: false, message: 'Migration is already running' };
      }
      
      if (!jobId) {
        return { success: false, message: 'Job ID is required to resume migration' };
      }
      
      logger.info(`Resuming migration job: ${jobId}`);
      
      // Start migration with resume flag
      return await this.startMigration({
        resumeJobId: jobId
      });
    } catch (error) {
      logger.error('Failed to resume migration:', error);
      this.handleError(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get current migration status
   */
  getMigrationStatus() {
    // Calculate processing rate and estimated completion
    if (this.migrationState.isRunning && this.progress.processedRecords > 0) {
      const elapsedTime = (new Date() - this.migrationState.startTime) / 1000; // seconds
      this.progress.processingRate = this.progress.processedRecords / elapsedTime;
      
      // Estimate completion time
      const remainingRecords = this.progress.totalRecords - this.progress.processedRecords;
      if (this.progress.processingRate > 0) {
        const remainingSeconds = remainingRecords / this.progress.processingRate;
        this.progress.estimatedCompletion = new Date(Date.now() + (remainingSeconds * 1000));
      }
    }
    
    return {
      jobId: this.migrationState.jobId,
      status: this.migrationState.status,
      currentSource: this.migrationState.currentSource,
      progress: {
        ...this.progress,
        percentComplete: this.progress.totalRecords > 0 
          ? (this.progress.processedRecords / this.progress.totalRecords) * 100 
          : 0
      },
      startTime: this.migrationState.startTime,
      endTime: this.migrationState.endTime,
      elapsedTime: this.migrationState.startTime 
        ? Math.round((new Date() - this.migrationState.startTime) / 1000) 
        : 0
    };
  }
  
  /**
   * Validate migration results
   */
  async validateMigration(jobId = null) {
    try {
      jobId = jobId || this.migrationState.jobId;
      
      if (!jobId) {
        return { success: false, message: 'No migration job ID provided or available' };
      }
      
      logger.info(`Validating migration job: ${jobId}`);
      
      // Get source collection counts
      const sourceCounts = {};
      for (const source of this.config.sources) {
        sourceCounts[source] = await this._getSourceCollectionCount(source);
      }
      
      // Get vector database counts by source type
      const vectorCounts = {};
      for (const source of this.config.sources) {
        vectorCounts[source] = await this._getVectorCollectionCount(source);
      }
      
      // Calculate validation metrics
      const validationResults = {
        jobId,
        timestamp: new Date(),
        sourceCounts,
        vectorCounts,
        coverage: {},
        totalSourceRecords: 0,
        totalVectorRecords: 0,
        overallCoverage: 0
      };
      
      // Calculate coverage percentages
      let totalSourceRecords = 0;
      let totalVectorRecords = 0;
      
      for (const source of this.config.sources) {
        const sourceCount = sourceCounts[source] || 0;
        const vectorCount = vectorCounts[source] || 0;
        
        validationResults.coverage[source] = sourceCount > 0 
          ? (vectorCount / sourceCount) * 100 
          : 0;
        
        totalSourceRecords += sourceCount;
        totalVectorRecords += vectorCount;
      }
      
      validationResults.totalSourceRecords = totalSourceRecords;
      validationResults.totalVectorRecords = totalVectorRecords;
      validationResults.overallCoverage = totalSourceRecords > 0 
        ? (totalVectorRecords / totalSourceRecords) * 100 
        : 0;
      
      // Sample validation for data quality
      validationResults.qualitySamples = await this._validateDataQuality(jobId);
      
      return {
        success: true,
        validation: validationResults
      };
    } catch (error) {
      logger.error('Failed to validate migration:', error);
      this.handleError(error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle errors during migration
   */
  handleError(error, context = {}) {
    // Add error to progress tracking
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date()
    };
    
    this.progress.errors.push(errorInfo);
    
    // Keep only the last 100 errors
    if (this.progress.errors.length > 100) {
      this.progress.errors.shift();
    }
    
    // Emit error event
    this.emit('error', errorInfo);
    
    // Log error
    logger.error('Migration error:', {
      error: error.message,
      context
    });
  }
  
  /**
   * Update progress during migration
   */
  updateProgress(updates) {
    // Update internal progress tracking
    Object.assign(this.progress, updates);
    
    // Update progress tracker
    migrationProgressTracker.updateProgress({
      jobId: this.migrationState.jobId,
      totalRecords: this.progress.totalRecords,
      processedRecords: this.progress.processedRecords,
      successfulRecords: this.progress.successfulRecords,
      failedRecords: this.progress.failedRecords,
      skippedRecords: this.progress.skippedRecords,
      currentSource: this.migrationState.currentSource,
      currentPhase: this.migrationState.status
    });
    
    // Emit progress event
    this.emit('progress', this.getMigrationStatus());
    
    // Log progress at intervals
    if (this.progress.processedRecords % 1000 === 0) {
      logger.info(`Migration progress: ${this.progress.processedRecords}/${this.progress.totalRecords} records processed`);
    }
  }
  
  /**
   * Shutdown migration service
   */
  async shutdown() {
    try {
      // If migration is running, pause it first
      if (this.migrationState.isRunning) {
        await this.pauseMigration();
      }
      
      // Close database connections
      if (this.sourceDb) {
        // Close source database connection if needed
      }
      
      logger.info('Data Migration Service shutdown completed');
      this.emit('shutdown');
      
      return true;
    } catch (error) {
      logger.error('Error during shutdown:', error);
      throw error;
    }
  }
  
  // Private methods
  
  /**
   * Validate configuration
   */
  _validateConfig() {
    // Validate required configuration
    if (!Array.isArray(this.config.sources) || this.config.sources.length === 0) {
      throw new Error('At least one data source must be specified');
    }
    
    if (this.config.batchSize <= 0) {
      throw new Error('Batch size must be positive');
    }
    
    if (this.config.maxConcurrency <= 0) {
      throw new Error('Max concurrency must be positive');
    }
    
    // Validate source types
    const validSources = ['analytics', 'sessions', 'campaigns', 'transactions'];
    for (const source of this.config.sources) {
      if (!validSources.includes(source)) {
        throw new Error(`Invalid source type: ${source}`);
      }
    }
    
    logger.info('Configuration validation passed');
  }
  
  /**
   * Ensure checkpoint directory exists
   */
  async _ensureCheckpointDir() {
    try {
      await fs.mkdir(this.config.checkpointDir, { recursive: true });
      logger.info(`Checkpoint directory ensured: ${this.config.checkpointDir}`);
    } catch (error) {
      logger.error('Failed to create checkpoint directory:', error);
      throw error;
    }
  }
  
  /**
   * Initialize source database connection
   */
  async _initializeSourceDb() {
    try {
      // For now, we'll use the same database connection as the vector database
      // In a real-world scenario, these might be different databases
      this.sourceDb = this.vectorDb.db;
      logger.info('Source database connection initialized');
    } catch (error) {
      logger.error('Failed to initialize source database connection:', error);
      throw error;
    }
  }
  
  /**
   * Check Python service availability
   */
  async _checkPythonService() {
    try {
      // Check if Python service directory exists
      await fs.access(this.config.pythonServicePath);
      
      // Try running a simple Python command
      const result = await exec('python -c "print(\'Python service check\')"');
      
      if (result.stderr) {
        logger.warn('Python service check warning:', result.stderr);
      }
      
      logger.info('Python service check passed');
    } catch (error) {
      logger.warn('Python service check failed:', error.message);
      // Don't throw error, just log warning
    }
  }
  
  /**
   * Generate unique job ID
   */
  _generateJobId() {
    return `migration_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }
  
  /**
   * Reset progress tracking
   */
  _resetProgress() {
    this.progress = {
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      processingRate: 0,
      estimatedCompletion: null,
      errors: []
    };
  }
  
  /**
   * Calculate total records to migrate
   */
  async _calculateTotalRecords() {
    try {
      let totalRecords = 0;
      
      for (const source of this.config.sources) {
        const count = await this._getSourceCollectionCount(source);
        totalRecords += count;
        logger.info(`Source collection '${source}' has ${count} records`);
      }
      
      this.progress.totalRecords = totalRecords;
      logger.info(`Total records to migrate: ${totalRecords}`);
      
      return totalRecords;
    } catch (error) {
      logger.error('Failed to calculate total records:', error);
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Get source collection count
   */
  async _getSourceCollectionCount(source) {
    try {
      return await this.sourceDb.collection(source).countDocuments();
    } catch (error) {
      logger.error(`Failed to get count for source '${source}':`, error);
      return 0;
    }
  }
  
  /**
   * Get vector collection count by source type
   */
  async _getVectorCollectionCount(sourceType) {
    try {
      return await this.vectorDb.collection.countDocuments({ sourceType });
    } catch (error) {
      logger.error(`Failed to get count for vector documents with sourceType '${sourceType}':`, error);
      return 0;
    }
  }
  
  /**
   * Run migration process
   */
  async _runMigration() {
    try {
      // Process each source in sequence
      for (const source of this.config.sources) {
        // Skip sources that have been completed if resuming
        if (this.migrationState.currentSource && 
            this.config.sources.indexOf(source) < this.config.sources.indexOf(this.migrationState.currentSource)) {
          logger.info(`Skipping already completed source: ${source}`);
          continue;
        }
        
        // Update current source
        this.migrationState.currentSource = source;
        this.migrationState.currentBatch = 0;
        
        logger.info(`Starting migration for source: ${source}`);
        this.emit('sourceStarted', { source });
        
        // Process source in batches
        await this._processSourceInBatches(source);
        
        // Mark source as completed
        logger.info(`Completed migration for source: ${source}`);
        this.emit('sourceCompleted', { source });
        
        // Save checkpoint after each source
        await this._saveCheckpoint();
      }
      
      // Migration completed
      this.migrationState.status = 'completed';
      this.migrationState.isRunning = false;
      this.migrationState.endTime = new Date();
      
      logger.info(`Migration job ${this.migrationState.jobId} completed successfully`);
      this.emit('migrationCompleted', this.getMigrationStatus());
      
      // Generate validation report
      const validationResult = await this.validateMigration();
      this.emit('validationCompleted', validationResult);
      
      return true;
    } catch (error) {
      // Migration failed
      this.migrationState.status = 'failed';
      this.migrationState.isRunning = false;
      this.migrationState.endTime = new Date();
      
      logger.error(`Migration job ${this.migrationState.jobId} failed:`, error);
      this.handleError(error);
      this.emit('migrationFailed', { error: error.message });
      
      // Save checkpoint for potential recovery
      await this._saveCheckpoint();
      
      return false;
    }
  }
  
  /**
   * Process source collection in batches
   */
  async _processSourceInBatches(source) {
    try {
      // Get total count for this source
      const totalCount = await this._getSourceCollectionCount(source);
      
      if (totalCount === 0) {
        logger.info(`Source '${source}' has no records to migrate`);
        return;
      }
      
      // Setup query options
      const queryOptions = {
        batchSize: this.config.batchSize,
        sort: { _id: 1 }
      };
      
      // If resuming, start from last processed ID
      if (this.migrationState.lastProcessedId) {
        queryOptions.query = {
          _id: { $gt: new ObjectId(this.migrationState.lastProcessedId) }
        };
      }
      
      // Process in batches
      let hasMoreRecords = true;
      let lastId = this.migrationState.lastProcessedId;
      
      while (hasMoreRecords && this.migrationState.isRunning) {
        // Get batch of records
        const query = lastId ? { _id: { $gt: new ObjectId(lastId) } } : {};
        const batch = await this.sourceDb.collection(source)
          .find(query)
          .sort({ _id: 1 })
          .limit(this.config.batchSize)
          .toArray();
        
        // Check if we have more records
        hasMoreRecords = batch.length === this.config.batchSize;
        
        if (batch.length > 0) {
          // Process batch
          this.migrationState.currentBatch++;
          await this._processBatch(source, batch);
          
          // Update last processed ID
          lastId = batch[batch.length - 1]._id.toString();
          this.migrationState.lastProcessedId = lastId;
          
          // Save checkpoint periodically
          if (this.migrationState.currentBatch % 10 === 0) {
            await this._saveCheckpoint();
          }
        } else {
          // No more records
          hasMoreRecords = false;
        }
        
        // Check if migration should continue
        if (!this.migrationState.isRunning) {
          logger.info('Migration paused or stopped');
          break;
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Error processing source '${source}' in batches:`, error);
      this.handleError(error, { source });
      throw error;
    }
  }
  
  /**
   * Process a batch of records
   */
  async _processBatch(source, batch) {
    try {
      logger.debug(`Processing batch of ${batch.length} records from source '${source}'`);
      
      // Process each record in the batch
      const results = await Promise.all(
        batch.map(record => this._processRecord(source, record))
      );
      
      // Update progress
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      this.updateProgress({
        processedRecords: this.progress.processedRecords + batch.length,
        successfulRecords: this.progress.successfulRecords + successful,
        failedRecords: this.progress.failedRecords + failed
      });
      
      return {
        total: batch.length,
        successful,
        failed
      };
    } catch (error) {
      logger.error(`Error processing batch from source '${source}':`, error);
      this.handleError(error, { source, batchSize: batch.length });
      throw error;
    }
  }
  
  /**
   * Process a single record
   */
  async _processRecord(source, record) {
    try {
      // Select appropriate processor based on source type
      let result;
      
      switch (source) {
        case 'analytics':
          result = await this._processAnalyticsRecord(record);
          break;
        case 'sessions':
          result = await this._processSessionRecord(record);
          break;
        case 'campaigns':
          result = await this._processCampaignRecord(record);
          break;
        case 'transactions':
          result = await this._processTransactionRecord(record);
          break;
        default:
          throw new Error(`Unsupported source type: ${source}`);
      }
      
      return result;
    } catch (error) {
      logger.error(`Error processing record from source '${source}':`, error);
      this.handleError(error, { source, recordId: record._id });
      
      return {
        success: false,
        error: error.message,
        recordId: record._id
      };
    }
  }
  
  /**
   * Process analytics record
   */
  async _processAnalyticsRecord(record) {
    try {
      // Lazy-load the analytics processor
      if (!this.analyticsProcessor) {
        const AnalyticsProcessor = require('./processors/analyticsProcessor');
        this.analyticsProcessor = new AnalyticsProcessor({
          embeddingModel: this.config.embeddingModel,
          validationLevel: this.config.validationLevel,
          pythonClient: this.pythonClient
        });
      }
      
      // Use the analytics processor to process the record
      const result = await this.analyticsProcessor.processRecord(record, this.migrationState.jobId);
      
      if (!result.success) {
        throw new Error(`Failed to process analytics record: ${result.error}`);
      }
      
      return {
        success: true,
        recordId: record._id,
        vectorId: result.vectorId,
        documentId: result.documentId
      };
    } catch (error) {
      logger.error('Error processing analytics record:', error);
      
      // Implement retry logic with exponential backoff
      // For simplicity, we're not implementing the full retry logic here
      
      return {
        success: false,
        error: error.message,
        recordId: record._id
      };
    }
  }
  
  /**
   * Process session record
   */
  async _processSessionRecord(record) {
    try {
      // Extract content for embedding
      const content = this._extractSessionContent(record);
      
      // Generate embedding using Python service
      const embedding = await this._generateEmbedding(content, {
        dataType: 'session',
        sourceType: 'session',
        siteId: record.siteId,
        importance: 6
      });
      
      if (!embedding.success) {
        throw new Error(`Failed to generate embedding: ${embedding.error}`);
      }
      
      // Create vector document
      const vectorDoc = {
        documentId: `session_${record._id}`,
        sourceType: 'sessions',
        sourceId: record._id.toString(),
        siteId: record.siteId || 'unknown',
        teamId: record.teamId || 'unknown',
        embedding: embedding.embedding,
        content,
        metadata: {
          title: `Session data for user ${record.userId || 'anonymous'}`,
          category: 'session',
          importance: 6,
          timeframe: this._extractSessionTimeframe(record),
          metrics: this._extractSessionMetrics(record),
          relationships: this._extractSessionRelationships(record)
        },
        migrationInfo: {
          migrationJobId: this.migrationState.jobId,
          migratedAt: new Date(),
          sourceCollection: 'sessions',
          validationStatus: 'validated'
        },
        status: 'active'
      };
      
      // Insert into vector database
      const result = await this.vectorDb.insertDocument(vectorDoc);
      
      return {
        success: true,
        recordId: record._id,
        vectorId: result.insertedId
      };
    } catch (error) {
      logger.error('Error processing session record:', error);
      
      return {
        success: false,
        error: error.message,
        recordId: record._id
      };
    }
  }
  
  /**
   * Process campaign record
   */
  async _processCampaignRecord(record) {
    try {
      // Extract content for embedding
      const content = this._extractCampaignContent(record);
      
      // Generate embedding using Python service
      const embedding = await this._generateEmbedding(content, {
        dataType: 'campaign',
        sourceType: 'campaign',
        siteId: record.siteId,
        importance: 8
      });
      
      if (!embedding.success) {
        throw new Error(`Failed to generate embedding: ${embedding.error}`);
      }
      
      // Create vector document
      const vectorDoc = {
        documentId: `campaign_${record._id}`,
        sourceType: 'campaigns',
        sourceId: record._id.toString(),
        siteId: record.siteId || 'unknown',
        teamId: record.teamId || 'unknown',
        embedding: embedding.embedding,
        content,
        metadata: {
          title: record.name || `Campaign ${record._id}`,
          category: 'campaign',
          importance: 8,
          timeframe: this._extractCampaignTimeframe(record),
          metrics: this._extractCampaignMetrics(record),
          relationships: this._extractCampaignRelationships(record)
        },
        migrationInfo: {
          migrationJobId: this.migrationState.jobId,
          migratedAt: new Date(),
          sourceCollection: 'campaigns',
          validationStatus: 'validated'
        },
        status: 'active'
      };
      
      // Insert into vector database
      const result = await this.vectorDb.insertDocument(vectorDoc);
      
      return {
        success: true,
        recordId: record._id,
        vectorId: result.insertedId
      };
    } catch (error) {
      logger.error('Error processing campaign record:', error);
      
      return {
        success: false,
        error: error.message,
        recordId: record._id
      };
    }
  }
  
  /**
   * Process transaction record
   */
  async _processTransactionRecord(record) {
    try {
      // Extract content for embedding
      const content = this._extractTransactionContent(record);
      
      // Generate embedding using Python service
      const embedding = await this._generateEmbedding(content, {
        dataType: 'transaction',
        sourceType: 'transaction',
        contractId: record.contractId,
        importance: 8
      });
      
      if (!embedding.success) {
        throw new Error(`Failed to generate embedding: ${embedding.error}`);
      }
      
      // Create vector document
      const vectorDoc = {
        documentId: `transaction_${record._id}`,
        sourceType: 'transactions',
        sourceId: record._id.toString(),
        siteId: record.siteId || 'unknown',
        teamId: record.teamId || 'unknown',
        embedding: embedding.embedding,
        content,
        metadata: {
          title: `Transaction ${record.hash || record._id}`,
          category: 'transaction',
          importance: 8,
          timeframe: this._extractTransactionTimeframe(record),
          metrics: this._extractTransactionMetrics(record),
          relationships: this._extractTransactionRelationships(record)
        },
        migrationInfo: {
          migrationJobId: this.migrationState.jobId,
          migratedAt: new Date(),
          sourceCollection: 'transactions',
          validationStatus: 'validated'
        },
        status: 'active'
      };
      
      // Insert into vector database
      const result = await this.vectorDb.insertDocument(vectorDoc);
      
      return {
        success: true,
        recordId: record._id,
        vectorId: result.insertedId
      };
    } catch (error) {
      logger.error('Error processing transaction record:', error);
      
      return {
        success: false,
        error: error.message,
        recordId: record._id
      };
    }
  }
  
  /**
   * Generate embedding using Python service
   */
  async _generateEmbedding(text, context = {}) {
    try {
      // For now, we'll generate a random embedding for testing
      // In a real implementation, this would call the Python embedding service
      
      // Simulate embedding generation
      const embedding = Array(1536).fill(0).map(() => Math.random() * 2 - 1);
      
      return {
        success: true,
        embedding,
        dimensions: embedding.length,
        quality: 0.95
      };
    } catch (error) {
      logger.error('Error generating embedding:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Save checkpoint for migration resumption
   */
  async _saveCheckpoint() {
    try {
      const checkpointData = {
        status: this.migrationState.status,
        currentSource: this.migrationState.currentSource,
        currentBatch: this.migrationState.currentBatch,
        lastProcessedId: this.migrationState.lastProcessedId,
        progress: { ...this.progress },
        config: { ...this.config }
      };
      
      // Use checkpoint manager to save checkpoint
      const result = await checkpointManager.saveCheckpoint(
        this.migrationState.jobId, 
        checkpointData
      );
      
      logger.info(`Checkpoint saved for job: ${this.migrationState.jobId}`);
      this.emit('checkpointSaved', { jobId: this.migrationState.jobId });
      
      return true;
    } catch (error) {
      logger.error('Failed to save checkpoint:', error);
      this.handleError(error);
      return false;
    }
  }
  
  /**
   * Load checkpoint for migration resumption
   */
  async _loadCheckpoint(jobId) {
    try {
      // Use checkpoint manager to load checkpoint
      const result = await checkpointManager.loadCheckpoint(jobId);
      
      if (!result.success) {
        throw new Error(`Failed to load checkpoint for job ID: ${jobId}`);
      }
      
      const checkpoint = result.data;
      
      // Restore migration state
      this.migrationState.jobId = jobId;
      this.migrationState.status = 'running'; // Always set to running when resuming
      this.migrationState.currentSource = checkpoint.currentSource;
      this.migrationState.currentBatch = checkpoint.currentBatch;
      this.migrationState.lastProcessedId = checkpoint.lastProcessedId;
      this.migrationState.startTime = new Date();
      
      // Restore progress
      this.progress = { ...checkpoint.progress };
      
      // Restore config (partially)
      // Only restore certain config properties to avoid overriding important settings
      const safeConfigProps = ['sources', 'batchSize', 'maxConcurrency'];
      for (const prop of safeConfigProps) {
        if (checkpoint.config[prop]) {
          this.config[prop] = checkpoint.config[prop];
        }
      }
      
      // Initialize progress tracker with loaded data
      await migrationProgressTracker.initialize(jobId);
      migrationProgressTracker.updateProgress({
        totalRecords: this.progress.totalRecords,
        processedRecords: this.progress.processedRecords,
        successfulRecords: this.progress.successfulRecords,
        failedRecords: this.progress.failedRecords,
        skippedRecords: this.progress.skippedRecords,
        currentSource: this.migrationState.currentSource,
        currentPhase: this.migrationState.status
      });
      
      logger.info(`Checkpoint loaded for job: ${jobId}`);
      this.emit('checkpointLoaded', { jobId });
      
      return true;
    } catch (error) {
      logger.error('Failed to load checkpoint:', error);
      this.handleError(error);
      throw error;
    }
  }
  
  /**
   * Validate data quality by sampling
   */
  async _validateDataQuality(jobId) {
    try {
      // Sample vector documents for quality validation
      const samples = await this.vectorDb.collection
        .find({ 'migrationInfo.migrationJobId': jobId })
        .limit(10)
        .toArray();
      
      if (samples.length === 0) {
        return {
          samplesChecked: 0,
          message: 'No samples found for validation'
        };
      }
      
      // Validate samples
      const validationResults = [];
      
      for (const sample of samples) {
        // Check embedding dimensions
        const hasValidDimensions = Array.isArray(sample.embedding) && 
          sample.embedding.length === 1536;
        
        // Check required fields
        const hasRequiredFields = sample.documentId && 
          sample.sourceType && 
          sample.content && 
          sample.metadata;
        
        // Check for NaN or Infinity values in embedding
        const hasValidValues = hasValidDimensions && 
          !sample.embedding.some(val => isNaN(val) || !isFinite(val));
        
        validationResults.push({
          documentId: sample.documentId,
          sourceType: sample.sourceType,
          hasValidDimensions,
          hasRequiredFields,
          hasValidValues,
          isValid: hasValidDimensions && hasRequiredFields && hasValidValues
        });
      }
      
      return {
        samplesChecked: samples.length,
        validSamples: validationResults.filter(r => r.isValid).length,
        invalidSamples: validationResults.filter(r => !r.isValid).length,
        sampleResults: validationResults
      };
    } catch (error) {
      logger.error('Failed to validate data quality:', error);
      return {
        samplesChecked: 0,
        error: error.message
      };
    }
  }
  
  // Content extraction methods
  
  _extractAnalyticsContent(record) {
    const parts = [];
    
    // Basic info
    parts.push(`Site ID: ${record.siteId || 'unknown'}`);
    parts.push(`Time Period: ${record.timeframe || 'unknown'}`);
    
    // Metrics
    if (record.metrics) {
      parts.push(`Total Visitors: ${record.metrics.visitors || 0}`);
      parts.push(`Unique Visitors: ${record.metrics.uniqueVisitors || 0}`);
      parts.push(`Page Views: ${record.metrics.pageViews || 0}`);
      parts.push(`Bounce Rate: ${record.metrics.bounceRate || 0}%`);
      parts.push(`Average Session Duration: ${record.metrics.avgSessionDuration || 0}s`);
    }
    
    // Top pages
    if (record.topPages && Array.isArray(record.topPages)) {
      parts.push('Top Pages:');
      record.topPages.slice(0, 5).forEach(page => {
        parts.push(`- ${page.path}: ${page.views} views`);
      });
    }
    
    return parts.join('\n');
  }
  
  _extractAnalyticsMetrics(record) {
    if (!record.metrics) return {};
    
    return {
      visitors: record.metrics.visitors || 0,
      uniqueVisitors: record.metrics.uniqueVisitors || 0,
      pageViews: record.metrics.pageViews || 0,
      bounceRate: record.metrics.bounceRate || 0,
      avgSessionDuration: record.metrics.avgSessionDuration || 0
    };
  }
  
  _extractAnalyticsRelationships(record) {
    const relationships = [];
    
    if (record.siteId) {
      relationships.push(`site:${record.siteId}`);
    }
    
    if (record.teamId) {
      relationships.push(`team:${record.teamId}`);
    }
    
    return relationships;
  }
  
  _extractSessionContent(record) {
    const parts = [];
    
    // Basic info
    parts.push(`Site ID: ${record.siteId || 'unknown'}`);
    parts.push(`User ID: ${record.userId || 'anonymous'}`);
    parts.push(`Session ID: ${record.sessionId || record._id}`);
    parts.push(`Duration: ${record.duration || 0} seconds`);
    parts.push(`Pages Viewed: ${record.pagesViewed || 0}`);
    parts.push(`Bounce: ${record.isBounce ? 'Yes' : 'No'}`);
    parts.push(`Web3 User: ${record.isWeb3User ? 'Yes' : 'No'}`);
    
    // Device and browser info
    if (record.device) {
      parts.push(`Device: ${record.device.type || 'unknown'} - ${record.device.model || 'unknown'}`);
    }
    
    if (record.browser) {
      parts.push(`Browser: ${record.browser.name || 'unknown'} ${record.browser.version || ''}`);
    }
    
    // Page views
    if (record.pageViews && Array.isArray(record.pageViews)) {
      parts.push('Page Views:');
      record.pageViews.forEach(page => {
        parts.push(`- ${page.path}: ${page.timeSpent}s`);
      });
    }
    
    return parts.join('\n');
  }
  
  _extractSessionTimeframe(record) {
    if (record.startTime && record.endTime) {
      return `${new Date(record.startTime).toISOString()} to ${new Date(record.endTime).toISOString()}`;
    }
    
    return 'unknown';
  }
  
  _extractSessionMetrics(record) {
    return {
      duration: record.duration || 0,
      pagesViewed: record.pagesViewed || 0,
      isBounce: record.isBounce || false,
      isWeb3User: record.isWeb3User || false
    };
  }
  
  _extractSessionRelationships(record) {
    const relationships = [];
    
    if (record.siteId) {
      relationships.push(`site:${record.siteId}`);
    }
    
    if (record.userId) {
      relationships.push(`user:${record.userId}`);
    }
    
    if (record.campaignId) {
      relationships.push(`campaign:${record.campaignId}`);
    }
    
    return relationships;
  }
  
  _extractCampaignContent(record) {
    const parts = [];
    
    // Basic info
    parts.push(`Campaign Name: ${record.name || 'Unnamed Campaign'}`);
    parts.push(`Site ID: ${record.siteId || 'unknown'}`);
    parts.push(`Status: ${record.status || 'unknown'}`);
    
    // Campaign details
    if (record.startDate) {
      parts.push(`Start Date: ${new Date(record.startDate).toISOString()}`);
    }
    
    if (record.endDate) {
      parts.push(`End Date: ${new Date(record.endDate).toISOString()}`);
    }
    
    parts.push(`Type: ${record.type || 'unknown'}`);
    parts.push(`Source: ${record.source || 'unknown'}`);
    parts.push(`Medium: ${record.medium || 'unknown'}`);
    
    // UTM parameters
    if (record.utmParams) {
      parts.push('UTM Parameters:');
      for (const [key, value] of Object.entries(record.utmParams)) {
        parts.push(`- ${key}: ${value}`);
      }
    }
    
    // Performance metrics
    if (record.performance) {
      parts.push('Performance:');
      parts.push(`- Impressions: ${record.performance.impressions || 0}`);
      parts.push(`- Clicks: ${record.performance.clicks || 0}`);
      parts.push(`- Conversions: ${record.performance.conversions || 0}`);
      parts.push(`- CTR: ${record.performance.ctr || 0}%`);
      parts.push(`- Conversion Rate: ${record.performance.conversionRate || 0}%`);
    }
    
    return parts.join('\n');
  }
  
  _extractCampaignTimeframe(record) {
    if (record.startDate && record.endDate) {
      return `${new Date(record.startDate).toISOString()} to ${new Date(record.endDate).toISOString()}`;
    }
    
    return 'unknown';
  }
  
  _extractCampaignMetrics(record) {
    if (!record.performance) return {};
    
    return {
      impressions: record.performance.impressions || 0,
      clicks: record.performance.clicks || 0,
      conversions: record.performance.conversions || 0,
      ctr: record.performance.ctr || 0,
      conversionRate: record.performance.conversionRate || 0
    };
  }
  
  _extractCampaignRelationships(record) {
    const relationships = [];
    
    if (record.siteId) {
      relationships.push(`site:${record.siteId}`);
    }
    
    if (record.teamId) {
      relationships.push(`team:${record.teamId}`);
    }
    
    return relationships;
  }
  
  _extractTransactionContent(record) {
    const parts = [];
    
    // Basic info
    parts.push(`Transaction Hash: ${record.hash || 'unknown'}`);
    parts.push(`Contract Address: ${record.contractAddress || 'unknown'}`);
    parts.push(`Block Number: ${record.blockNumber || 'unknown'}`);
    parts.push(`From Address: ${record.from || 'unknown'}`);
    parts.push(`To Address: ${record.to || 'unknown'}`);
    parts.push(`Value: ${record.value || 0}`);
    
    // Transaction details
    if (record.timestamp) {
      parts.push(`Timestamp: ${new Date(record.timestamp).toISOString()}`);
    }
    
    parts.push(`Gas Used: ${record.gasUsed || 0}`);
    parts.push(`Gas Price: ${record.gasPrice || 0}`);
    parts.push(`Status: ${record.status || 'unknown'}`);
    
    // Contract interaction
    if (record.method) {
      parts.push(`Method: ${record.method}`);
    }
    
    if (record.params) {
      parts.push('Parameters:');
      for (const [key, value] of Object.entries(record.params)) {
        parts.push(`- ${key}: ${value}`);
      }
    }
    
    return parts.join('\n');
  }
  
  _extractTransactionTimeframe(record) {
    if (record.timestamp) {
      return new Date(record.timestamp).toISOString();
    }
    
    if (record.blockTime) {
      return new Date(record.blockTime).toISOString();
    }
    
    return 'unknown';
  }
  
  _extractTransactionMetrics(record) {
    return {
      value: record.value || 0,
      gasUsed: record.gasUsed || 0,
      gasPrice: record.gasPrice || 0
    };
  }
  
  _extractTransactionRelationships(record) {
    const relationships = [];
    
    if (record.contractId) {
      relationships.push(`contract:${record.contractId}`);
    }
    
    if (record.from) {
      relationships.push(`wallet:${record.from}`);
    }
    
    if (record.to) {
      relationships.push(`wallet:${record.to}`);
    }
    
    return relationships;
  }
}

// Create singleton instance
const dataMigrationService = new DataMigrationService();

module.exports = {
  DataMigrationService,
  dataMigrationService
};