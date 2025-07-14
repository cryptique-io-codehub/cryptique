/**
 * Analytics Data Migration Script for RAG Implementation
 * 
 * This script extracts analytics data from the existing database,
 * transforms it into a format suitable for vector embedding,
 * and prepares it for insertion into the vector database.
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Analytics = require('../../models/analytics');
const GranularEvents = require('../../models/granularEvents');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../../models/stats');
const VectorDocument = require('../../models/vectorDocument');
const EmbeddingJob = require('../../models/embeddingJob');

// Default team ID for records without teamId
const DEFAULT_TEAM_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_TEAM_ID || '000000000000000000000001');

// Configuration
const BATCH_SIZE = 50;
const MAX_RETRIES = 3;
const PROGRESS_FILE = path.join(__dirname, 'migration-progress.json');

// Initialize progress tracking
let progress = {
  currentPhase: 'analytics-extraction',
  totalRecords: 0,
  processedRecords: 0,
  failedRecords: 0,
  startTime: new Date().toISOString(),
  estimatedCompletion: null,
  errors: [],
  rollbackData: {
    createdDocumentIds: []
  }
};

/**
 * Main migration function
 */
async function migrateAnalyticsData() {
  try {
    console.log('Starting analytics data migration...');
    
    // Load existing progress if available
    loadProgress();
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    }
    
    // Execute migration phases
    if (progress.currentPhase === 'analytics-extraction' || !progress.currentPhase) {
      await extractAnalyticsData();
      progress.currentPhase = 'transformation';
      saveProgress();
    }
    
    if (progress.currentPhase === 'transformation') {
      await transformData();
      progress.currentPhase = 'validation';
      saveProgress();
    }
    
    if (progress.currentPhase === 'validation') {
      await validateData();
      progress.currentPhase = 'embedding-job-creation';
      saveProgress();
    }
    
    if (progress.currentPhase === 'embedding-job-creation') {
      await createEmbeddingJobs();
      progress.currentPhase = 'completed';
      saveProgress();
    }
    
    console.log('Analytics data migration completed successfully');
    console.log(`Total records processed: ${progress.processedRecords}`);
    console.log(`Failed records: ${progress.failedRecords}`);
    
    return {
      success: true,
      processedRecords: progress.processedRecords,
      failedRecords: progress.failedRecords,
      errors: progress.errors
    };
    
  } catch (error) {
    console.error('Migration failed:', error);
    progress.errors.push({
      phase: progress.currentPhase,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    saveProgress();
    
    return {
      success: false,
      error: error.message,
      phase: progress.currentPhase
    };
  }
}

/**
 * Extract analytics data from the database
 */
async function extractAnalyticsData() {
  console.log('Extracting analytics data...');
  
  // Get total count for progress tracking
  const totalAnalytics = await Analytics.countDocuments();
  const totalEvents = await GranularEvents.countDocuments();
  const totalHourlyStats = await HourlyStats.countDocuments();
  const totalDailyStats = await DailyStats.countDocuments();
  const totalWeeklyStats = await WeeklyStats.countDocuments();
  const totalMonthlyStats = await MonthlyStats.countDocuments();
  const totalStats = totalHourlyStats + totalDailyStats + totalWeeklyStats + totalMonthlyStats;
  
  progress.totalRecords = totalAnalytics + totalEvents + totalStats;
  saveProgress();
  
  console.log(`Found ${progress.totalRecords} total records to process`);
  
  // Extract data in batches
  const extractedData = {
    analytics: [],
    events: [],
    stats: []
  };
  
  // Extract analytics
  let skip = 0;
  let batch;
  do {
    batch = await Analytics.find()
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();
    
    extractedData.analytics.push(...batch);
    skip += batch.length;
    progress.processedRecords += batch.length;
    saveProgress();
    
  } while (batch.length === BATCH_SIZE);
  
  // Extract events
  skip = 0;
  do {
    batch = await GranularEvents.find()
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();
    
    extractedData.events.push(...batch);
    skip += batch.length;
    progress.processedRecords += batch.length;
    saveProgress();
    
  } while (batch.length === BATCH_SIZE);
  
  // Extract stats from all stat models
  const statModels = [HourlyStats, DailyStats, WeeklyStats, MonthlyStats];
  
  for (const StatModel of statModels) {
    skip = 0;
    do {
      batch = await StatModel.find()
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();
      
      // Add model type to distinguish between different stat types
      const batchWithType = batch.map(stat => ({
        ...stat,
        _statType: StatModel.modelName
      }));
      
      extractedData.stats.push(...batchWithType);
      skip += batch.length;
      progress.processedRecords += batch.length;
      saveProgress();
      
    } while (batch.length === BATCH_SIZE);
  }
  
  // Save extracted data to temporary file for processing
  const tempFile = path.join(__dirname, 'temp-extracted-data.json');
  fs.writeFileSync(tempFile, JSON.stringify(extractedData, null, 2));
  
  console.log(`Extracted data saved to ${tempFile}`);
  console.log(`Analytics: ${extractedData.analytics.length}`);
  console.log(`Events: ${extractedData.events.length}`);
  console.log(`Stats: ${extractedData.stats.length}`);
  
  return extractedData;
}

/**
 * Transform extracted data into format suitable for vector embedding
 */
async function transformData() {
  console.log('Transforming data...');
  
  // Load extracted data
  const tempFile = path.join(__dirname, 'temp-extracted-data.json');
  const extractedData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
  
  // Reset progress for this phase
  progress.processedRecords = 0;
  progress.totalRecords = extractedData.analytics.length + extractedData.events.length + extractedData.stats.length;
  saveProgress();
  
  // Transform analytics data
  const transformedData = [];
  
  // Process analytics
  for (const analytics of extractedData.analytics) {
    try {
      const transformed = transformAnalyticsRecord(analytics);
      transformedData.push(transformed);
      progress.processedRecords++;
    } catch (error) {
      console.error(`Error transforming analytics record ${analytics._id}:`, error);
      progress.failedRecords++;
      progress.errors.push({
        phase: 'transformation',
        recordId: analytics._id,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (progress.processedRecords % 100 === 0) {
      saveProgress();
    }
  }
  
  // Process events
  for (const event of extractedData.events) {
    try {
      const transformed = transformEventRecord(event);
      transformedData.push(transformed);
      progress.processedRecords++;
    } catch (error) {
      console.error(`Error transforming event record ${event._id}:`, error);
      progress.failedRecords++;
      progress.errors.push({
        phase: 'transformation',
        recordId: event._id,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (progress.processedRecords % 100 === 0) {
      saveProgress();
    }
  }
  
  // Process stats
  for (const stat of extractedData.stats) {
    try {
      const transformed = transformStatsRecord(stat);
      transformedData.push(transformed);
      progress.processedRecords++;
    } catch (error) {
      console.error(`Error transforming stats record ${stat._id}:`, error);
      progress.failedRecords++;
      progress.errors.push({
        phase: 'transformation',
        recordId: stat._id,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (progress.processedRecords % 100 === 0) {
      saveProgress();
    }
  }
  
  // Save transformed data
  const transformedFile = path.join(__dirname, 'transformed-data.json');
  fs.writeFileSync(transformedFile, JSON.stringify(transformedData, null, 2));
  
  console.log(`Transformation complete. ${transformedData.length} records transformed.`);
  console.log(`Failed transformations: ${progress.failedRecords}`);
  
  return transformedData;
}

/**
 * Transform an analytics record
 */
function transformAnalyticsRecord(record) {
  // Generate a unique document ID
  const documentId = `analytics-${record._id.toString()}`;
  
  // Extract timeframe with validation
  const timestamp = record.timestamp || record.createdAt || new Date();
  const timeframe = {
    start: new Date(timestamp),
    end: new Date(timestamp)
  };
  
  // Validate dates
  if (isNaN(timeframe.start.getTime())) {
    timeframe.start = new Date();
  }
  if (isNaN(timeframe.end.getTime())) {
    timeframe.end = new Date();
  }
  
  // Generate content for embedding
  const content = generateAnalyticsContent(record);
  
  // Generate summary
  const summary = `Analytics data for ${record.siteId || 'unknown site'} at ${timeframe.start.toISOString()}`;
  
  // Create vector document structure
  return {
    documentId,
    sourceType: 'analytics',
    sourceId: record._id,
    siteId: record.siteId || 'unknown',
    teamId: record.teamId || getDefaultTeamId(),
    content,
    summary,
    metadata: {
      timeframe,
      dataType: 'metric',
      tags: generateTags(record),
      importance: calculateImportance(record),
      metricType: 'analytics',
      aggregationLevel: 'raw'
    }
  };
}

/**
 * Transform an event record
 */
function transformEventRecord(record) {
  // Generate a unique document ID
  const documentId = `event-${record._id.toString()}`;
  
  // Extract timeframe with validation
  const timestamp = record.timestamp || record.createdAt || new Date();
  const timeframe = {
    start: new Date(timestamp),
    end: new Date(timestamp)
  };
  
  // Validate dates
  if (isNaN(timeframe.start.getTime())) {
    timeframe.start = new Date();
  }
  if (isNaN(timeframe.end.getTime())) {
    timeframe.end = new Date();
  }
  
  // Generate content for embedding
  const content = generateEventContent(record);
  
  // Generate summary
  const summary = `Event data for ${record.siteId || 'unknown site'} at ${timeframe.start.toISOString()}`;
  
  // Create vector document structure
  return {
    documentId,
    sourceType: 'analytics',
    sourceId: record._id,
    siteId: record.siteId || 'unknown',
    teamId: record.teamId || getDefaultTeamId(),
    content,
    summary,
    metadata: {
      timeframe,
      dataType: 'event',
      tags: generateTags(record),
      importance: calculateImportance(record),
      metricType: 'event',
      aggregationLevel: 'raw'
    }
  };
}

/**
 * Transform a stats record
 */
function transformStatsRecord(record) {
  // Generate a unique document ID
  const documentId = `stats-${record._id.toString()}`;
  
  // Extract timeframe with validation
  const startTime = record.period?.start || record.createdAt || new Date();
  const endTime = record.period?.end || record.createdAt || new Date();
  
  const timeframe = {
    start: new Date(startTime),
    end: new Date(endTime)
  };
  
  // Validate dates
  if (isNaN(timeframe.start.getTime())) {
    timeframe.start = new Date();
  }
  if (isNaN(timeframe.end.getTime())) {
    timeframe.end = new Date();
  }
  
  // Generate content for embedding
  const content = generateStatsContent(record);
  
  // Generate summary
  const summary = `Statistics for ${record.siteId || 'unknown site'} from ${timeframe.start.toISOString()} to ${timeframe.end.toISOString()}`;
  
  // Create vector document structure
  return {
    documentId,
    sourceType: 'analytics',
    sourceId: record._id,
    siteId: record.siteId || 'unknown',
    teamId: record.teamId || getDefaultTeamId(),
    content,
    summary,
    metadata: {
      timeframe,
      dataType: 'metric',
      tags: generateTags(record),
      importance: calculateImportance(record),
      metricType: 'aggregated',
      aggregationLevel: record.period?.type || record._statType || 'daily'
    }
  };
}

/**
 * Generate content for analytics record
 */
function generateAnalyticsContent(record) {
  let content = `Analytics data for site ${record.siteId || 'unknown'}\n`;
  content += `Timestamp: ${new Date(record.timestamp || record.createdAt).toISOString()}\n\n`;
  
  // Add metrics
  if (record.metrics) {
    content += 'Metrics:\n';
    for (const [key, value] of Object.entries(record.metrics)) {
      content += `- ${key}: ${value}\n`;
    }
    content += '\n';
  }
  
  // Add user data
  if (record.user) {
    content += 'User Information:\n';
    content += `- User ID: ${record.user.userId || 'anonymous'}\n`;
    content += `- Session ID: ${record.user.sessionId || 'unknown'}\n`;
    if (record.user.walletAddress) {
      content += `- Wallet Address: ${record.user.walletAddress}\n`;
    }
    content += '\n';
  }
  
  // Add page data
  if (record.page) {
    content += 'Page Information:\n';
    content += `- URL: ${record.page.url || 'unknown'}\n`;
    content += `- Title: ${record.page.title || 'unknown'}\n`;
    content += `- Referrer: ${record.page.referrer || 'direct'}\n`;
    content += '\n';
  }
  
  // Add device data
  if (record.device) {
    content += 'Device Information:\n';
    content += `- Type: ${record.device.type || 'unknown'}\n`;
    content += `- Browser: ${record.device.browser || 'unknown'}\n`;
    content += `- OS: ${record.device.os || 'unknown'}\n`;
    content += '\n';
  }
  
  // Add location data
  if (record.location) {
    content += 'Location Information:\n';
    content += `- Country: ${record.location.country || 'unknown'}\n`;
    content += `- Region: ${record.location.region || 'unknown'}\n`;
    content += `- City: ${record.location.city || 'unknown'}\n`;
    content += '\n';
  }
  
  return content;
}

/**
 * Generate content for event record
 */
function generateEventContent(record) {
  let content = `Event data for site ${record.siteId || 'unknown'}\n`;
  content += `Event Type: ${record.eventType || 'unknown'}\n`;
  content += `Timestamp: ${new Date(record.timestamp || record.createdAt).toISOString()}\n\n`;
  
  // Add event details
  if (record.eventData) {
    content += 'Event Details:\n';
    for (const [key, value] of Object.entries(record.eventData)) {
      content += `- ${key}: ${JSON.stringify(value)}\n`;
    }
    content += '\n';
  }
  
  // Add user data
  if (record.user) {
    content += 'User Information:\n';
    content += `- User ID: ${record.user.userId || 'anonymous'}\n`;
    content += `- Session ID: ${record.user.sessionId || 'unknown'}\n`;
    if (record.user.walletAddress) {
      content += `- Wallet Address: ${record.user.walletAddress}\n`;
    }
    content += '\n';
  }
  
  // Add context data
  if (record.context) {
    content += 'Context Information:\n';
    for (const [key, value] of Object.entries(record.context)) {
      content += `- ${key}: ${JSON.stringify(value)}\n`;
    }
    content += '\n';
  }
  
  return content;
}

/**
 * Generate content for stats record
 */
function generateStatsContent(record) {
  let content = `Statistics for site ${record.siteId || 'unknown'}\n`;
  content += `Period: ${record.period?.type || 'daily'}\n`;
  content += `From: ${new Date(record.period?.start || record.createdAt).toISOString()}\n`;
  content += `To: ${new Date(record.period?.end || record.createdAt).toISOString()}\n\n`;
  
  // Add metrics
  if (record.metrics) {
    content += 'Aggregated Metrics:\n';
    for (const [key, value] of Object.entries(record.metrics)) {
      content += `- ${key}: ${value}\n`;
    }
    content += '\n';
  }
  
  // Add breakdowns
  if (record.breakdowns) {
    content += 'Breakdowns:\n';
    for (const [category, breakdown] of Object.entries(record.breakdowns)) {
      content += `${category} Breakdown:\n`;
      for (const [key, value] of Object.entries(breakdown)) {
        content += `- ${key}: ${value}\n`;
      }
      content += '\n';
    }
  }
  
  return content;
}

/**
 * Generate tags for a record
 */
function generateTags(record) {
  const tags = ['analytics'];
  
  // Add source type
  if (record.eventType) {
    tags.push('event', record.eventType.toLowerCase());
  } else {
    tags.push('metric');
  }
  
  // Add device type if available
  if (record.device?.type) {
    tags.push(record.device.type.toLowerCase());
  }
  
  // Add location if available
  if (record.location?.country) {
    tags.push(record.location.country.toLowerCase());
  }
  
  // Add user type
  if (record.user?.walletAddress) {
    tags.push('web3-user');
  }
  
  return tags;
}

/**
 * Calculate importance score for a record
 */
function calculateImportance(record) {
  // Base importance
  let importance = 5;
  
  // Increase importance for conversion events
  if (record.eventType === 'conversion' || record.eventType === 'transaction') {
    importance += 2;
  }
  
  // Increase importance for web3 users
  if (record.user?.walletAddress) {
    importance += 1;
  }
  
  // Increase importance for errors
  if (record.eventType === 'error' || record.metrics?.errors > 0) {
    importance += 1;
  }
  
  // Cap importance between 1-10
  return Math.min(Math.max(importance, 1), 10);
}

/**
 * Get default team ID for records without teamId
 */
function getDefaultTeamId() {
  return DEFAULT_TEAM_ID;
}

/**
 * Validate transformed data
 */
async function validateData() {
  console.log('Validating transformed data...');
  
  // Load transformed data
  const transformedFile = path.join(__dirname, 'transformed-data.json');
  const transformedData = JSON.parse(fs.readFileSync(transformedFile, 'utf8'));
  
  // Reset progress for this phase
  progress.processedRecords = 0;
  progress.totalRecords = transformedData.length;
  saveProgress();
  
  const validationErrors = [];
  const validRecords = [];
  
  // Validate each record
  for (const record of transformedData) {
    try {
      // Check required fields
      const requiredFields = ['documentId', 'sourceType', 'sourceId', 'siteId', 'teamId', 'content'];
      for (const field of requiredFields) {
        if (!record[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Validate teamId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(record.teamId)) {
        throw new Error(`Invalid teamId: ${record.teamId}`);
      }
      
      // Check content length
      if (record.content.length < 10) {
        throw new Error('Content is too short');
      }
      
      // Check metadata
      if (!record.metadata || !record.metadata.timeframe) {
        throw new Error('Missing metadata or timeframe');
      }
      
      // Record is valid
      validRecords.push(record);
      progress.processedRecords++;
      
    } catch (error) {
      console.error(`Validation error for document ${record.documentId}:`, error);
      validationErrors.push({
        documentId: record.documentId,
        error: error.message
      });
      progress.failedRecords++;
      progress.errors.push({
        phase: 'validation',
        documentId: record.documentId,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    if (progress.processedRecords % 100 === 0) {
      saveProgress();
    }
  }
  
  // Save validation results
  const validationFile = path.join(__dirname, 'validation-results.json');
  fs.writeFileSync(validationFile, JSON.stringify({
    validRecords: validRecords.length,
    errors: validationErrors
  }, null, 2));
  
  console.log(`Validation complete. ${validRecords.length} valid records.`);
  console.log(`Validation errors: ${validationErrors.length}`);
  
  // Save valid records
  const validRecordsFile = path.join(__dirname, 'valid-records.json');
  fs.writeFileSync(validRecordsFile, JSON.stringify(validRecords, null, 2));
  
  return {
    validRecords,
    errors: validationErrors
  };
}

/**
 * Create embedding jobs for validated data
 */
async function createEmbeddingJobs() {
  console.log('Creating embedding jobs...');
  
  // Load valid records
  const validRecordsFile = path.join(__dirname, 'valid-records.json');
  const validRecords = JSON.parse(fs.readFileSync(validRecordsFile, 'utf8'));
  
  // Group records by team for batch processing
  const recordsByTeam = {};
  for (const record of validRecords) {
    const teamId = record.teamId.toString();
    if (!recordsByTeam[teamId]) {
      recordsByTeam[teamId] = [];
    }
    recordsByTeam[teamId].push(record);
  }
  
  // Reset progress for this phase
  progress.processedRecords = 0;
  progress.totalRecords = Object.keys(recordsByTeam).length;
  saveProgress();
  
  // Create jobs by team
  for (const [teamId, records] of Object.entries(recordsByTeam)) {
    try {
      // Create embedding job
      const job = new EmbeddingJob({
        jobId: `analytics-migration-${teamId}-${Date.now()}`,
        jobType: 'migration',
        priority: 5,
        sourceType: 'analytics',
        sourceIds: records.map(r => r.sourceId),
        teamId,
        status: 'pending',
        progress: {
          total: records.length,
          processed: 0,
          failed: 0,
          percentage: 0
        },
        config: {
          batchSize: 50,
          chunkSize: 1000,
          overlapSize: 200
        },
        metadata: {
          triggeredBy: 'migration',
          reason: 'Analytics data migration for RAG',
          tags: ['migration', 'analytics', 'rag']
        },
        scheduledFor: new Date()
      });
      
      await job.save();
      console.log(`Created embedding job ${job.jobId} for team ${teamId} with ${records.length} records`);
      
      progress.processedRecords++;
      saveProgress();
      
    } catch (error) {
      console.error(`Error creating embedding job for team ${teamId}:`, error);
      progress.failedRecords++;
      progress.errors.push({
        phase: 'embedding-job-creation',
        teamId,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  console.log(`Created ${progress.processedRecords} embedding jobs`);
  console.log(`Failed job creations: ${progress.failedRecords}`);
  
  return {
    jobsCreated: progress.processedRecords,
    failedJobs: progress.failedRecords
  };
}

/**
 * Load progress from file
 */
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const savedProgress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
      progress = { ...progress, ...savedProgress };
      console.log(`Loaded progress: Phase ${progress.currentPhase}, ${progress.processedRecords}/${progress.totalRecords} records processed`);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
  }
}

/**
 * Save progress to file
 */
function saveProgress() {
  try {
    // Update estimated completion
    if (progress.processedRecords > 0 && progress.totalRecords > 0) {
      const startTime = new Date(progress.startTime).getTime();
      const now = Date.now();
      const elapsed = now - startTime;
      const recordsRemaining = progress.totalRecords - progress.processedRecords;
      const timePerRecord = elapsed / progress.processedRecords;
      const estimatedTimeRemaining = recordsRemaining * timePerRecord;
      
      progress.estimatedCompletion = new Date(now + estimatedTimeRemaining).toISOString();
    }
    
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error('Error saving progress:', error);
  }
}

/**
 * Execute migration if run directly
 */
if (require.main === module) {
  // Set environment variables if not set
  if (!process.env.MONGODB_URI) {
    try {
      require('dotenv').config();
    } catch (e) {
      console.warn('dotenv not installed, using default environment');
    }
  }
  
  migrateAnalyticsData()
    .then(result => {
      console.log('Migration completed:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
} else {
  // Export for use as module
  module.exports = {
    migrateAnalyticsData,
    extractAnalyticsData,
    transformData,
    validateData,
    createEmbeddingJobs
  };
} 