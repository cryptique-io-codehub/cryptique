const mongoose = require('mongoose');
const PipelineOrchestrationService = require('../services/pipelineOrchestrationService');

// Set environment variables
process.env.MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = 'AIzaSyCGeKpBs18-Ie7uAIYEiT3Yyop6Jd9HBo0';
process.env.GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/embedding-001';

async function startPipeline() {
  try {
    console.log('🚀 Starting Pipeline Orchestration Service...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
    
    // Initialize pipeline service
    const pipelineService = new PipelineOrchestrationService({
      maxConcurrentJobs: 2,
      maxRetries: 3,
      retryDelayMs: 5000,
      healthCheckInterval: 30000,
      jobTimeout: 600000, // 10 minutes
      geminiEmbedding: {
        apiKey: process.env.GEMINI_API_KEY,
        model: 'embedding-001',
        batchSize: 10
      },
      documentProcessing: {
        chunkSize: 1000,
        chunkOverlap: 200,
        batchSize: 50
      }
    });
    
    // Set up event listeners
    pipelineService.on('job-queued', (data) => {
      console.log(`📝 Job queued: ${data.jobId} (${data.source})`);
    });
    
    pipelineService.on('job-started', (data) => {
      console.log(`🔄 Job started: ${data.jobId} (${data.source})`);
    });
    
    pipelineService.on('job-completed', (data) => {
      console.log(`✅ Job completed: ${data.jobId}`);
      console.log(`   - Processing time: ${data.processingTime}ms`);
      console.log(`   - Documents processed: ${data.documentsProcessed}`);
      console.log(`   - Chunks created: ${data.chunksCreated}`);
    });
    
    pipelineService.on('job-failed', (data) => {
      console.log(`❌ Job failed: ${data.jobId}`);
      console.log(`   - Error: ${data.error}`);
      console.log(`   - Retry count: ${data.retryCount}`);
    });
    
    pipelineService.on('job-retry', (data) => {
      console.log(`🔄 Job retry: ${data.jobId} (attempt ${data.retryCount})`);
    });
    
    pipelineService.on('health-check', (health) => {
      console.log(`🏥 Health check: ${health.status}`);
      if (health.status !== 'healthy') {
        console.log(`   - Issues: ${JSON.stringify(health.checks)}`);
      }
    });
    
    // Start the service
    await pipelineService.start();
    console.log('✅ Pipeline service started successfully');
    
    // Check for pending jobs and process them
    const EmbeddingJob = require('../models/embeddingJob');
    const pendingJobs = await EmbeddingJob.find({ status: 'pending' });
    
    if (pendingJobs.length > 0) {
      console.log(`📋 Found ${pendingJobs.length} pending jobs to process`);
      
      // Add pending jobs to the queue
      for (const job of pendingJobs) {
        try {
          await pipelineService.addJob({
            source: job.sourceType,
            documentIds: job.sourceIds,
            batchSize: job.config?.batchSize || 50,
            priority: job.priority || 'medium',
            configuration: job.config || {}
          });
          console.log(`✅ Added job ${job.jobId} to processing queue`);
        } catch (error) {
          console.error(`❌ Failed to add job ${job.jobId} to queue:`, error);
        }
      }
    } else {
      console.log('📋 No pending jobs found');
    }
    
    // Keep the service running
    console.log('🔄 Pipeline service is running. Press Ctrl+C to stop.');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down pipeline service...');
      await pipelineService.stop();
      await mongoose.connection.close();
      console.log('✅ Pipeline service stopped');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start pipeline service:', error);
    process.exit(1);
  }
}

startPipeline(); 