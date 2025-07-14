/**
 * Test Script for Analytics Data Migration
 * 
 * This script tests the analytics data migration process by:
 * 1. Creating test data
 * 2. Running the migration
 * 3. Validating the results
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
const migration = require('./analytics-data-migration');

// Test configuration
const TEST_TEAM_ID = new mongoose.Types.ObjectId();
const TEST_SITE_ID = 'test-site-001';
const TEST_RECORD_COUNT = 100;
const TEST_RESULTS_FILE = path.join(__dirname, 'test-results.json');

// Test results
const testResults = {
  startTime: new Date().toISOString(),
  endTime: null,
  success: false,
  phases: {
    setup: { success: false, error: null },
    extraction: { success: false, error: null, count: 0 },
    transformation: { success: false, error: null, count: 0 },
    validation: { success: false, error: null, count: 0 },
    jobCreation: { success: false, error: null, count: 0 },
    cleanup: { success: false, error: null }
  }
};

/**
 * Main test function
 */
async function testMigration() {
  try {
    console.log('Starting analytics migration test...');
    
    // Connect to MongoDB
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    }
    
    // Setup test data
    await setupTestData();
    testResults.phases.setup.success = true;
    
    // Run extraction
    const extractedData = await testExtraction();
    testResults.phases.extraction.success = true;
    testResults.phases.extraction.count = extractedData.analytics.length + 
                                         extractedData.events.length + 
                                         extractedData.stats.length;
    
    // Run transformation
    const transformedData = await testTransformation();
    testResults.phases.transformation.success = true;
    testResults.phases.transformation.count = transformedData.length;
    
    // Run validation
    const validationResult = await testValidation();
    testResults.phases.validation.success = true;
    testResults.phases.validation.count = validationResult.validRecords.length;
    
    // Run job creation
    const jobsResult = await testJobCreation();
    testResults.phases.jobCreation.success = true;
    testResults.phases.jobCreation.count = jobsResult.jobsCreated;
    
    // Cleanup
    await cleanupTestData();
    testResults.phases.cleanup.success = true;
    
    // Mark test as successful
    testResults.success = true;
    console.log('Migration test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    const phase = Object.keys(testResults.phases).find(
      p => !testResults.phases[p].success
    );
    
    if (phase) {
      testResults.phases[phase].error = error.message;
    }
    
  } finally {
    // Save test results
    testResults.endTime = new Date().toISOString();
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`Test results saved to ${TEST_RESULTS_FILE}`);
    
    return testResults;
  }
}

/**
 * Setup test data
 */
async function setupTestData() {
  console.log('Setting up test data...');
  
  // Create test analytics records
  const analyticsRecords = [];
  for (let i = 0; i < TEST_RECORD_COUNT / 2; i++) {
    analyticsRecords.push({
      siteId: TEST_SITE_ID,
      teamId: TEST_TEAM_ID,
      timestamp: new Date(Date.now() - i * 3600000),
      metrics: {
        pageViews: Math.floor(Math.random() * 100),
        sessions: Math.floor(Math.random() * 50),
        bounceRate: Math.random() * 100,
        avgSessionDuration: Math.floor(Math.random() * 300)
      },
      user: {
        userId: `user-${i % 20}`,
        sessionId: `session-${i}`,
        walletAddress: i % 3 === 0 ? `0x${i.toString(16).padStart(40, '0')}` : null
      },
      page: {
        url: `https://example.com/page-${i % 10}`,
        title: `Test Page ${i % 10}`,
        referrer: i % 5 === 0 ? 'https://google.com' : null
      },
      device: {
        type: ['desktop', 'mobile', 'tablet'][i % 3],
        browser: ['Chrome', 'Firefox', 'Safari'][i % 3],
        os: ['Windows', 'MacOS', 'iOS', 'Android'][i % 4]
      },
      location: {
        country: ['US', 'UK', 'CA', 'JP', 'DE'][i % 5],
        region: `Region-${i % 10}`,
        city: `City-${i % 20}`
      }
    });
  }
  
  await Analytics.insertMany(analyticsRecords);
  console.log(`Created ${analyticsRecords.length} analytics records`);
  
  // Create test event records
  const eventRecords = [];
  for (let i = 0; i < TEST_RECORD_COUNT / 4; i++) {
    eventRecords.push({
      siteId: TEST_SITE_ID,
      teamId: TEST_TEAM_ID,
      timestamp: new Date(Date.now() - i * 7200000),
      eventType: ['pageview', 'click', 'conversion', 'transaction', 'error'][i % 5],
      eventData: {
        element: i % 5 === 1 ? `button-${i % 10}` : null,
        value: i % 5 === 2 ? Math.random() * 1000 : null,
        transactionId: i % 5 === 3 ? `tx-${i}` : null,
        errorCode: i % 5 === 4 ? `ERR-${i % 10}` : null
      },
      user: {
        userId: `user-${i % 20}`,
        sessionId: `session-${i}`,
        walletAddress: i % 4 === 0 ? `0x${i.toString(16).padStart(40, '0')}` : null
      },
      context: {
        page: `https://example.com/page-${i % 10}`,
        referrer: i % 5 === 0 ? 'https://google.com' : null,
        campaign: i % 10 === 0 ? `campaign-${i % 5}` : null
      }
    });
  }
  
  await GranularEvents.insertMany(eventRecords);
  console.log(`Created ${eventRecords.length} event records`);
  
  // Create test stats records
  const statsRecords = [];
  for (let i = 0; i < TEST_RECORD_COUNT / 4; i++) {
    const startDate = new Date(Date.now() - i * 86400000);
    const endDate = new Date(startDate.getTime() + 86400000);
    
    statsRecords.push({
      siteId: TEST_SITE_ID,
      teamId: TEST_TEAM_ID,
      period: {
        type: ['hourly', 'daily', 'weekly', 'monthly'][i % 4],
        start: startDate,
        end: endDate
      },
      metrics: {
        totalPageViews: Math.floor(Math.random() * 10000),
        uniqueVisitors: Math.floor(Math.random() * 5000),
        bounceRate: Math.random() * 100,
        avgSessionDuration: Math.floor(Math.random() * 300),
        conversionRate: Math.random() * 10,
        errors: Math.floor(Math.random() * 50)
      },
      breakdowns: {
        devices: {
          desktop: Math.floor(Math.random() * 70),
          mobile: Math.floor(Math.random() * 25),
          tablet: Math.floor(Math.random() * 5)
        },
        countries: {
          US: Math.floor(Math.random() * 50),
          UK: Math.floor(Math.random() * 20),
          CA: Math.floor(Math.random() * 15),
          JP: Math.floor(Math.random() * 10),
          DE: Math.floor(Math.random() * 5)
        }
      }
    });
  }
  
  await DailyStats.insertMany(statsRecords);
  console.log(`Created ${statsRecords.length} stats records`);
  
  return {
    analytics: analyticsRecords.length,
    events: eventRecords.length,
    stats: statsRecords.length
  };
}

/**
 * Test extraction phase
 */
async function testExtraction() {
  console.log('Testing extraction phase...');
  
  try {
    // Call extraction function
    const extractedData = await migration.extractAnalyticsData();
    
    // Verify extraction
    console.log(`Extracted ${extractedData.analytics.length} analytics records`);
    console.log(`Extracted ${extractedData.events.length} event records`);
    console.log(`Extracted ${extractedData.stats.length} stats records`);
    
    // Verify counts match what we created
    const analyticsCount = await Analytics.countDocuments({ teamId: TEST_TEAM_ID });
    const eventsCount = await GranularEvents.countDocuments({ teamId: TEST_TEAM_ID });
    const statsCount = await DailyStats.countDocuments({ teamId: TEST_TEAM_ID });
    
    console.assert(
      extractedData.analytics.length >= analyticsCount,
      `Expected at least ${analyticsCount} analytics records, got ${extractedData.analytics.length}`
    );
    
    console.assert(
      extractedData.events.length >= eventsCount,
      `Expected at least ${eventsCount} event records, got ${extractedData.events.length}`
    );
    
    console.assert(
      extractedData.stats.length >= statsCount,
      `Expected at least ${statsCount} stats records, got ${extractedData.stats.length}`
    );
    
    return extractedData;
    
  } catch (error) {
    console.error('Extraction test failed:', error);
    throw error;
  }
}

/**
 * Test transformation phase
 */
async function testTransformation() {
  console.log('Testing transformation phase...');
  
  try {
    // Call transformation function
    const transformedData = await migration.transformData();
    
    // Verify transformation
    console.log(`Transformed ${transformedData.length} records`);
    
    // Check sample records
    if (transformedData.length > 0) {
      const sample = transformedData[0];
      console.log('Sample transformed record:');
      console.log(JSON.stringify(sample, null, 2));
      
      // Verify required fields
      const requiredFields = ['documentId', 'sourceType', 'sourceId', 'siteId', 'teamId', 'content', 'metadata'];
      for (const field of requiredFields) {
        console.assert(
          sample[field] !== undefined,
          `Missing required field: ${field}`
        );
      }
    }
    
    return transformedData;
    
  } catch (error) {
    console.error('Transformation test failed:', error);
    throw error;
  }
}

/**
 * Test validation phase
 */
async function testValidation() {
  console.log('Testing validation phase...');
  
  try {
    // Call validation function
    const validationResult = await migration.validateData();
    
    // Verify validation
    console.log(`Validated ${validationResult.validRecords.length} records`);
    console.log(`Found ${validationResult.errors.length} validation errors`);
    
    return validationResult;
    
  } catch (error) {
    console.error('Validation test failed:', error);
    throw error;
  }
}

/**
 * Test job creation phase
 */
async function testJobCreation() {
  console.log('Testing job creation phase...');
  
  try {
    // Call job creation function
    const jobsResult = await migration.createEmbeddingJobs();
    
    // Verify job creation
    console.log(`Created ${jobsResult.jobsCreated} embedding jobs`);
    
    // Check jobs in database
    const jobs = await EmbeddingJob.find({
      jobType: 'migration',
      teamId: TEST_TEAM_ID
    });
    
    console.log(`Found ${jobs.length} jobs in database`);
    
    return jobsResult;
    
  } catch (error) {
    console.error('Job creation test failed:', error);
    throw error;
  }
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  try {
    // Delete test analytics records
    await Analytics.deleteMany({ teamId: TEST_TEAM_ID });
    
    // Delete test event records
    await GranularEvents.deleteMany({ teamId: TEST_TEAM_ID });
    
    // Delete test stats records
    await HourlyStats.deleteMany({ teamId: TEST_TEAM_ID });
    await DailyStats.deleteMany({ teamId: TEST_TEAM_ID });
    await WeeklyStats.deleteMany({ teamId: TEST_TEAM_ID });
    await MonthlyStats.deleteMany({ teamId: TEST_TEAM_ID });
    
    // Delete test embedding jobs
    await EmbeddingJob.deleteMany({ 
      jobType: 'migration',
      teamId: TEST_TEAM_ID
    });
    
    // Delete test vector documents
    await VectorDocument.deleteMany({
      teamId: TEST_TEAM_ID
    });
    
    console.log('Test data cleanup completed');
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    throw error;
  }
}

/**
 * Execute test if run directly
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
  
  testMigration()
    .then(results => {
      console.log('Test completed:', results.success ? 'SUCCESS' : 'FAILED');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
} else {
  // Export for use as module
  module.exports = {
    testMigration,
    setupTestData,
    cleanupTestData
  };
} 