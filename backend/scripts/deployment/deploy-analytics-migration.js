/**
 * Analytics Migration Deployment Script
 * 
 * This script handles the complete deployment process including:
 * 1. Database backup (using Node.js native MongoDB driver)
 * 2. Migration execution
 * 3. Validation
 * 4. Rollback if needed
 */

// Set environment variables directly
process.env.MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = 'AIzaSyCGeKpBs18-Ie7uAIYEiT3Yyop6Jd9HBo0';
process.env.GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001';
process.env.NODE_ENV = 'production';
process.env.MIGRATION_BATCH_SIZE = '50';
process.env.MIGRATION_CHUNK_SIZE = '1000';
process.env.MIGRATION_OVERLAP_SIZE = '200';
process.env.DEFAULT_TEAM_ID = '000000000000000000000001';

// Try to load .env if it exists
try {
  require('dotenv').config();
} catch (e) {
  console.log('No .env file found, using hardcoded values');
}

const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { migrateAnalyticsData } = require('../migration/analytics-data-migration');

// Models
const Analytics = require('../../models/analytics');
const GranularEvents = require('../../models/granularEvents');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../../models/stats');
const VectorDocument = require('../../models/vectorDocument');
const EmbeddingJob = require('../../models/embeddingJob');

// Configuration
const BACKUP_DIR = path.join(__dirname, '../../backups');
const LOG_DIR = path.join(__dirname, '../../logs');
const BATCH_SIZE = 100;

// Deployment state
let deploymentState = {
  startTime: null,
  backupPath: null,
  migrationJobIds: [],
  status: 'pending',
  error: null,
  stats: {
    backupRecords: 0,
    migratedRecords: 0,
    vectorDocuments: 0,
    errors: []
  }
};

/**
 * Create backup of existing data
 */
async function createBackup() {
  console.log('Creating database backup...');
  
  try {
    // Create backup directory if it doesn't exist
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    // Create timestamp-based backup directory
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup_${timestamp}`);
    await fs.mkdir(backupPath);
    
    // Backup collections
    const collections = [
      { model: Analytics, name: 'analytics' },
      { model: GranularEvents, name: 'granularevents' },
      { model: HourlyStats, name: 'hourlystats' },
      { model: DailyStats, name: 'dailystats' },
      { model: WeeklyStats, name: 'weeklystats' },
      { model: MonthlyStats, name: 'monthlystats' }
    ];
    
    for (const { model, name } of collections) {
      const docs = await model.find().lean();
      if (docs.length > 0) {
        await fs.writeFile(
          path.join(backupPath, `${name}.json`),
          JSON.stringify(docs, null, 2)
        );
        deploymentState.stats.backupRecords += docs.length;
      }
    }
    
    deploymentState.backupPath = backupPath;
    console.log(`Backup created at: ${backupPath}`);
    console.log(`Total records backed up: ${deploymentState.stats.backupRecords}`);
    
    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    deploymentState.error = error;
    return false;
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  console.log('Validating migration results...');
  
  try {
    // Check vector documents were created
    const vectorCount = await VectorDocument.countDocuments();
    deploymentState.stats.vectorDocuments = vectorCount;
    
    // Check embedding jobs completed successfully
    const jobs = await EmbeddingJob.find({
      _id: { $in: deploymentState.migrationJobIds }
    });
    
    const failedJobs = jobs.filter(job => job.status === 'failed');
    if (failedJobs.length > 0) {
      throw new Error(`${failedJobs.length} jobs failed during migration`);
    }
    
    // Verify record counts
    const sourceRecords = deploymentState.stats.backupRecords;
    if (vectorCount < sourceRecords * 0.9) { // Allow 10% tolerance for deduplication
      throw new Error(`Vector document count (${vectorCount}) is significantly less than source records (${sourceRecords})`);
    }
    
    console.log('Migration validation successful');
    console.log(`Vector documents created: ${vectorCount}`);
    return true;
    
  } catch (error) {
    console.error('Validation failed:', error);
    deploymentState.error = error;
    return false;
  }
}

/**
 * Rollback migration
 */
async function rollback() {
  console.log('Rolling back migration...');
  
  try {
    // Delete created vector documents
    await VectorDocument.deleteMany({
      _id: { $in: deploymentState.migrationJobIds }
    });
    
    // Delete embedding jobs
    await EmbeddingJob.deleteMany({
      _id: { $in: deploymentState.migrationJobIds }
    });
    
    console.log('Rollback completed successfully');
    return true;
    
  } catch (error) {
    console.error('Rollback failed:', error);
    deploymentState.error = error;
    return false;
  }
}

/**
 * Save deployment state
 */
async function saveDeploymentState() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    const logPath = path.join(LOG_DIR, `deployment_${deploymentState.startTime}.json`);
    await fs.writeFile(logPath, JSON.stringify(deploymentState, null, 2));
  } catch (error) {
    console.error('Failed to save deployment state:', error);
  }
}

/**
 * Main deployment function
 */
async function deploy() {
  deploymentState.startTime = new Date().toISOString();
  deploymentState.status = 'in_progress';
  
  try {
    console.log('🚀 Starting Analytics Migration Deployment');
    console.log('==========================================');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    }
    console.log('✅ Connected to MongoDB');
    
    // Create backup
    console.log('\n1. Creating Backup...');
    const backupSuccess = await createBackup();
    if (!backupSuccess) {
      throw new Error('Backup failed');
    }
    console.log('✅ Backup completed');
    
    // Run migration
    console.log('\n2. Running Migration...');
    const migrationResult = await migrateAnalyticsData();
    if (!migrationResult.success) {
      throw new Error('Migration failed: ' + migrationResult.error);
    }
    
    deploymentState.migrationJobIds = migrationResult.jobIds || [];
    deploymentState.stats.migratedRecords = migrationResult.processedRecords;
    console.log('✅ Migration completed');
    
    // Validate results
    console.log('\n3. Validating Migration...');
    const validationSuccess = await validateMigration();
    if (!validationSuccess) {
      throw new Error('Validation failed');
    }
    console.log('✅ Validation completed');
    
    // Migration successful
    deploymentState.status = 'completed';
    console.log('\n🎉 Deployment completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Deployment failed:', error);
    deploymentState.status = 'failed';
    deploymentState.error = error;
    
    // Attempt rollback
    console.log('\n⏪ Attempting rollback...');
    await rollback();
  }
  
  // Save final state
  await saveDeploymentState();
  
  // Log summary
  console.log('\n📊 Deployment Summary:');
  console.log('=====================');
  console.log(`Status: ${deploymentState.status}`);
  console.log(`Backup Location: ${deploymentState.backupPath}`);
  console.log(`Records Backed Up: ${deploymentState.stats.backupRecords}`);
  console.log(`Records Migrated: ${deploymentState.stats.migratedRecords}`);
  console.log(`Vector Documents: ${deploymentState.stats.vectorDocuments}`);
  if (deploymentState.error) {
    console.log(`Error: ${deploymentState.error.message}`);
  }
  
  // Exit
  process.exit(deploymentState.status === 'completed' ? 0 : 1);
}

// Run deployment if executed directly
if (require.main === module) {
  deploy().catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

module.exports = {
  deploy,
  rollback,
  validateMigration,
  deploymentState
}; 