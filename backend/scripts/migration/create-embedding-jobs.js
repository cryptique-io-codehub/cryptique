#!/usr/bin/env node

/**
 * Create Embedding Jobs for Existing Analytics Data
 * 
 * This script creates embedding jobs for existing analytics data
 * without going through the full migration process.
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

try {
  require('dotenv').config();
} catch (e) {
  console.log('No .env file found, using hardcoded values');
}

const mongoose = require('mongoose');
const Analytics = require('../../models/analytics');
const GranularEvents = require('../../models/granularEvents');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../../models/stats');
const EmbeddingJob = require('../../models/embeddingJob');

// Default team ID for records without teamId
const DEFAULT_TEAM_ID = new mongoose.Types.ObjectId(process.env.DEFAULT_TEAM_ID || '000000000000000000000001');

async function createEmbeddingJobs() {
  try {
    console.log('Creating embedding jobs for existing analytics data...');
    
    // Connect to MongoDB if not already connected
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    }
    
    // Get counts
    const analyticsCount = await Analytics.countDocuments();
    const eventsCount = await GranularEvents.countDocuments();
    const hourlyStatsCount = await HourlyStats.countDocuments();
    const dailyStatsCount = await DailyStats.countDocuments();
    const weeklyStatsCount = await WeeklyStats.countDocuments();
    const monthlyStatsCount = await MonthlyStats.countDocuments();
    
    console.log(`Found ${analyticsCount} analytics records`);
    console.log(`Found ${eventsCount} event records`);
    console.log(`Found ${hourlyStatsCount + dailyStatsCount + weeklyStatsCount + monthlyStatsCount} stats records`);
    
    const totalRecords = analyticsCount + eventsCount + hourlyStatsCount + dailyStatsCount + weeklyStatsCount + monthlyStatsCount;
    
    if (totalRecords === 0) {
      console.log('No data found to process');
      return;
    }
    
    // Create a single embedding job for all the data
    const job = new EmbeddingJob({
      jobId: `analytics-migration-${DEFAULT_TEAM_ID}-${Date.now()}`,
      jobType: 'migration',
      priority: 5,
      sourceType: 'analytics',
      sourceIds: [], // Will be populated during processing
      teamId: DEFAULT_TEAM_ID,
      status: 'pending',
      progress: {
        total: totalRecords,
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
        tags: ['migration', 'analytics', 'rag'],
        notes: `Processing ${totalRecords} records from analytics, events, and stats collections`
      },
      scheduledFor: new Date()
    });
    
    await job.save();
    console.log(`Created embedding job ${job.jobId} for ${totalRecords} records`);
    
    // Create summary
    const summary = {
      success: true,
      jobId: job.jobId,
      totalRecords,
      breakdown: {
        analytics: analyticsCount,
        events: eventsCount,
        hourlyStats: hourlyStatsCount,
        dailyStats: dailyStatsCount,
        weeklyStats: weeklyStatsCount,
        monthlyStats: monthlyStatsCount
      }
    };
    
    console.log('\n=== Job Creation Summary ===');
    console.log(`Job ID: ${summary.jobId}`);
    console.log(`Total Records: ${summary.totalRecords}`);
    console.log(`Analytics: ${summary.breakdown.analytics}`);
    console.log(`Events: ${summary.breakdown.events}`);
    console.log(`Stats: ${summary.breakdown.hourlyStats + summary.breakdown.dailyStats + summary.breakdown.weeklyStats + summary.breakdown.monthlyStats}`);
    console.log('=============================\n');
    
    console.log('Next steps:');
    console.log('1. The embedding job has been created and will be processed by the pipeline orchestration service');
    console.log('2. Monitor the job progress in the admin dashboard');
    console.log('3. Check the vector documents collection for the embedded data');
    
    return summary;
    
  } catch (error) {
    console.error('Error creating embedding jobs:', error);
    throw error;
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed');
    }
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  // Set environment variables if not set
  if (!process.env.MONGODB_URI) {
    try {
      require('dotenv').config();
    } catch (e) {
      console.warn('dotenv not installed, using default environment');
    }
  }
  
  createEmbeddingJobs()
    .then(result => {
      console.log('Embedding jobs created successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to create embedding jobs:', error);
      process.exit(1);
    });
} else {
  // Export for use as module
  module.exports = { createEmbeddingJobs };
} 