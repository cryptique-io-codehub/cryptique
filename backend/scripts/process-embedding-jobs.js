const mongoose = require('mongoose');
const EmbeddingJob = require('../models/embeddingJob');
const VectorDocument = require('../models/vectorDocument');
const Analytics = require('../models/analytics');
const GranularEvents = require('../models/granularEvents');
const { HourlyStats, DailyStats, WeeklyStats, MonthlyStats } = require('../models/stats');

// Set environment variables
process.env.MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = 'AIzaSyCGeKpBs18-Ie7uAIYEiT3Yyop6Jd9HBo0';

// Mock embedding function (since we don't have actual Gemini API working)
function generateMockEmbedding(text) {
  // Create a 1536-dimensional vector (Gemini embedding size)
  const embedding = new Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  return embedding;
}

async function processEmbeddingJobs() {
  try {
    console.log('🚀 Processing embedding jobs...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find pending jobs
    const pendingJobs = await EmbeddingJob.find({ status: 'pending' });
    
    if (pendingJobs.length === 0) {
      console.log('📋 No pending jobs found');
      return;
    }
    
    console.log(`📋 Found ${pendingJobs.length} pending jobs to process`);
    
    for (const job of pendingJobs) {
      try {
        console.log(`🔄 Processing job: ${job.jobId}`);
        
        // Update job status
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();
        
        // Get source data based on job type
        let sourceData = [];
        
        if (job.sourceType === 'analytics') {
          // Get all analytics data
          const analytics = await Analytics.find().lean();
          const events = await GranularEvents.find().lean();
          const stats = await Promise.all([
            HourlyStats.find().lean(),
            DailyStats.find().lean(),
            WeeklyStats.find().lean(),
            MonthlyStats.find().lean()
          ]);
          
          sourceData = [...analytics, ...events, ...stats.flat()];
        }
        
        console.log(`📊 Processing ${sourceData.length} source records`);
        
        // Process each record
        const vectorDocuments = [];
        let processed = 0;
        
        for (const record of sourceData) {
          try {
            // Generate content for embedding
            const content = generateContentForRecord(record);
            
            // Generate mock embedding
            const embedding = generateMockEmbedding(content);
            
            // Create vector document
            const vectorDoc = {
              documentId: `${job.sourceType}-${record._id}`,
              sourceType: job.sourceType,
              sourceId: record._id,
              siteId: record.siteId || 'unknown',
              teamId: record.teamId || new mongoose.Types.ObjectId('000000000000000000000001'),
              embedding: embedding,
              content: content,
              summary: content.substring(0, 200) + '...',
              metadata: {
                timeframe: {
                  start: record.timestamp || record.createdAt || new Date(),
                  end: record.timestamp || record.createdAt || new Date()
                },
                dataType: 'metric',
                tags: ['analytics', 'migration'],
                importance: 5,
                metricType: 'analytics',
                aggregationLevel: 'raw'
              },
              status: 'active',
              version: 1,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            vectorDocuments.push(vectorDoc);
            processed++;
            
            // Update job progress
            if (processed % 100 === 0) {
              job.progress.processed = processed;
              job.progress.percentage = Math.round((processed / sourceData.length) * 100);
              await job.save();
              console.log(`   Progress: ${processed}/${sourceData.length} (${job.progress.percentage}%)`);
            }
            
          } catch (error) {
            console.error(`   Error processing record ${record._id}:`, error);
            job.progress.failed++;
          }
        }
        
        // Batch insert vector documents
        if (vectorDocuments.length > 0) {
          console.log(`💾 Inserting ${vectorDocuments.length} vector documents...`);
          
          // Insert in batches to avoid memory issues
          const batchSize = 100;
          for (let i = 0; i < vectorDocuments.length; i += batchSize) {
            const batch = vectorDocuments.slice(i, i + batchSize);
            await VectorDocument.insertMany(batch);
            console.log(`   Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(vectorDocuments.length/batchSize)}`);
          }
        }
        
        // Update job as completed
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress.processed = processed;
        job.progress.total = sourceData.length;
        job.progress.percentage = 100;
        await job.save();
        
        console.log(`✅ Job completed: ${job.jobId}`);
        console.log(`   - Records processed: ${processed}`);
        console.log(`   - Vector documents created: ${vectorDocuments.length}`);
        console.log(`   - Failed records: ${job.progress.failed}`);
        
      } catch (error) {
        console.error(`❌ Job failed: ${job.jobId}`, error);
        
        // Update job as failed
        job.status = 'failed';
        job.failedAt = new Date();
        job.error = {
          message: error.message,
          stack: error.stack,
          timestamp: new Date()
        };
        await job.save();
      }
    }
    
    console.log('🎉 All embedding jobs processed!');
    
    // Show final statistics
    const completedJobs = await EmbeddingJob.countDocuments({ status: 'completed' });
    const failedJobs = await EmbeddingJob.countDocuments({ status: 'failed' });
    const vectorCount = await VectorDocument.countDocuments();
    
    console.log('\n📊 Final Statistics:');
    console.log(`   - Completed jobs: ${completedJobs}`);
    console.log(`   - Failed jobs: ${failedJobs}`);
    console.log(`   - Total vector documents: ${vectorCount}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error processing embedding jobs:', error);
    process.exit(1);
  }
}

function generateContentForRecord(record) {
  let content = '';
  
  if (record.eventType) {
    // Event record
    content += `Event: ${record.eventType}\n`;
    content += `Site: ${record.siteId || 'unknown'}\n`;
    content += `Timestamp: ${record.timestamp || record.createdAt}\n`;
    
    if (record.eventData) {
      const eventDataStr = JSON.stringify(record.eventData);
      content += `Event Data: ${eventDataStr.length > 500 ? eventDataStr.substring(0, 500) + '...' : eventDataStr}\n`;
    }
    
    if (record.user) {
      content += `User: ${record.user.userId || 'anonymous'}\n`;
      if (record.user.walletAddress) {
        content += `Wallet: ${record.user.walletAddress}\n`;
      }
    }
    
  } else if (record.metrics) {
    // Analytics record
    content += `Analytics Data\n`;
    content += `Site: ${record.siteId || 'unknown'}\n`;
    content += `Timestamp: ${record.timestamp || record.createdAt}\n`;
    
    if (record.metrics) {
      const metricsStr = JSON.stringify(record.metrics);
      content += `Metrics: ${metricsStr.length > 500 ? metricsStr.substring(0, 500) + '...' : metricsStr}\n`;
    }
    
    if (record.user) {
      content += `User: ${record.user.userId || 'anonymous'}\n`;
    }
    
    if (record.page) {
      content += `Page: ${record.page.url || 'unknown'}\n`;
    }
    
  } else if (record.period) {
    // Stats record
    content += `Statistics\n`;
    content += `Site: ${record.siteId || 'unknown'}\n`;
    content += `Period: ${record.period.type || 'unknown'}\n`;
    content += `From: ${record.period.start}\n`;
    content += `To: ${record.period.end}\n`;
    
    if (record.metrics) {
      const metricsStr = JSON.stringify(record.metrics);
      content += `Metrics: ${metricsStr.length > 500 ? metricsStr.substring(0, 500) + '...' : metricsStr}\n`;
    }
    
  } else {
    // Generic record - limit the data length
    content += `Data Record\n`;
    content += `Site: ${record.siteId || 'unknown'}\n`;
    content += `Timestamp: ${record.timestamp || record.createdAt}\n`;
    
    // Create a summary of the record instead of full JSON
    const recordSummary = {
      _id: record._id,
      siteId: record.siteId,
      totalVisitors: record.totalVisitors,
      uniqueVisitors: record.uniqueVisitors,
      web3Visitors: record.web3Visitors,
      totalPageViews: record.totalPageViews,
      newVisitors: record.newVisitors,
      returningVisitors: record.returningVisitors,
      walletsConnected: record.walletsConnected,
      avgSessionDuration: record.avgSessionDuration,
      bounceRate: record.bounceRate,
      pagesPerVisit: record.pagesPerVisit
    };
    
    content += `Summary: ${JSON.stringify(recordSummary)}\n`;
  }
  
  // Ensure content doesn't exceed 2000 characters
  if (content.length > 2000) {
    content = content.substring(0, 2000) + '...';
  }
  
  return content;
}

processEmbeddingJobs(); 