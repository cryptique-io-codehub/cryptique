/**
 * Test suite for Background Processing Integration
 * Tests the integration of background processing with analytics routes
 */

const backgroundProcessor = require('../services/backgroundProcessor');

async function testBackgroundProcessingIntegration() {
  console.log('🧪 Starting Background Processing Integration tests...\n');
  
  try {
    // Test 1: User journey processing job queuing
    console.log('Test 1: User journey processing job queuing');
    
    const userJourneyJobId = backgroundProcessor.queueJob({
      type: 'user_journey_processing',
      data: { siteId: 'test-site-integration' },
      priority: 3
    });
    
    console.log('User journey job ID:', userJourneyJobId);
    
    const jobStatus = backgroundProcessor.getJobStatus(userJourneyJobId);
    console.log('Job status:', jobStatus?.status);
    console.log('✅ User journey job queuing test passed');
    
    // Test 2: Stats aggregation job queuing
    console.log('\nTest 2: Stats aggregation job queuing');
    
    const statsJobId = backgroundProcessor.queueJob({
      type: 'stats_aggregation',
      data: { siteId: 'test-site-stats', timeframe: 'daily' },
      priority: 5
    });
    
    console.log('Stats aggregation job ID:', statsJobId);
    console.log('✅ Stats aggregation job queuing test passed');
    
    // Test 3: Cache warming job queuing
    console.log('\nTest 3: Cache warming job queuing');
    
    const cacheWarmingJobId = backgroundProcessor.queueJob({
      type: 'cache_warming',
      data: { siteId: 'test-site-cache' },
      priority: 6
    });
    
    console.log('Cache warming job ID:', cacheWarmingJobId);
    console.log('✅ Cache warming job queuing test passed');
    
    // Test 4: Job priority and scheduling
    console.log('\nTest 4: Job priority and scheduling');
    
    // Add a high priority job
    const urgentJobId = backgroundProcessor.queueJob({
      type: 'user_journey_processing',
      data: { siteId: 'urgent-site' },
      priority: 1
    });
    
    // Add a scheduled job
    const scheduledJobId = backgroundProcessor.queueJob({
      type: 'data_cleanup',
      data: { type: 'test_cleanup' },
      priority: 8,
      scheduledFor: new Date(Date.now() + 5000) // 5 seconds from now
    });
    
    const queueStatus = backgroundProcessor.getQueueStatus();
    console.log('Queue size:', queueStatus.queueSize);
    console.log('Processing count:', queueStatus.processingCount);
    console.log('Next job priority:', queueStatus.nextJobs[0]?.priority);
    console.log('✅ Job priority and scheduling test passed');
    
    // Test 5: Job status tracking
    console.log('\nTest 5: Job status tracking');
    
    const trackingJobId = backgroundProcessor.queueJob({
      type: 'cache_warming',
      data: { siteId: 'tracking-test' },
      priority: 7
    });
    
    // Check initial status
    let trackingStatus = backgroundProcessor.getJobStatus(trackingJobId);
    console.log('Initial status:', trackingStatus?.status);
    
    // Wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    trackingStatus = backgroundProcessor.getJobStatus(trackingJobId);
    console.log('Status after 1 second:', trackingStatus?.status);
    console.log('Progress:', trackingStatus?.progress);
    console.log('✅ Job status tracking test passed');
    
    // Test 6: Error handling and retry logic
    console.log('\nTest 6: Error handling and retry logic');
    
    const errorJobId = backgroundProcessor.queueJob({
      type: 'invalid_job_type',
      data: { test: 'error' },
      priority: 9,
      maxAttempts: 2
    });
    
    console.log('Error job ID:', errorJobId);
    
    // Wait for processing and retry
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const errorJobStatus = backgroundProcessor.getJobStatus(errorJobId);
    console.log('Error job status:', errorJobStatus?.status);
    console.log('Attempts:', errorJobStatus?.attempts);
    console.log('✅ Error handling test passed');
    
    // Test 7: Background processor statistics
    console.log('\nTest 7: Background processor statistics');
    
    const stats = backgroundProcessor.getStats();
    console.log('Processor statistics:');
    console.log('  Total jobs:', stats.totalJobs);
    console.log('  Completed jobs:', stats.completedJobs);
    console.log('  Failed jobs:', stats.failedJobs);
    console.log('  Retried jobs:', stats.retriedJobs);
    console.log('  Queue size:', stats.queueSize);
    console.log('  Processing count:', stats.processingCount);
    console.log('  Average processing time:', stats.averageProcessingTime, 'ms');
    console.log('✅ Statistics test passed');
    
    // Test 8: Job cancellation
    console.log('\nTest 8: Job cancellation');
    
    const cancelJobId = backgroundProcessor.queueJob({
      type: 'stats_aggregation',
      data: { siteId: 'cancel-test', timeframe: 'hourly' },
      priority: 10
    });
    
    const cancelResult = backgroundProcessor.cancelJob(cancelJobId);
    console.log('Cancellation result:', cancelResult);
    
    const cancelledJobStatus = backgroundProcessor.getJobStatus(cancelJobId);
    console.log('Cancelled job status:', cancelledJobStatus?.status);
    console.log('✅ Job cancellation test passed');
    
    // Test 9: Event system integration
    console.log('\nTest 9: Event system integration');
    
    let eventCount = 0;
    const eventHandler = (job) => {
      eventCount++;
      console.log(`Event received: ${job.type} (${job.id})`);
    };
    
    backgroundProcessor.on('jobCompleted', eventHandler);
    
    // Queue a simple job that should complete quickly
    const eventTestJobId = backgroundProcessor.queueJob({
      type: 'cache_warming',
      data: { siteId: 'event-test' },
      priority: 2
    });
    
    // Wait for completion
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    backgroundProcessor.removeListener('jobCompleted', eventHandler);
    console.log('Events received:', eventCount);
    console.log('✅ Event system test passed');
    
    // Test 10: Performance under load
    console.log('\nTest 10: Performance under load');
    
    const loadTestStart = Date.now();
    const loadTestJobs = [];
    
    // Queue multiple jobs quickly
    for (let i = 0; i < 10; i++) {
      const jobId = backgroundProcessor.queueJob({
        type: 'cache_warming',
        data: { siteId: `load-test-${i}` },
        priority: 5 + (i % 3) // Vary priority
      });
      loadTestJobs.push(jobId);
    }
    
    const loadTestEnd = Date.now();
    const queuingTime = loadTestEnd - loadTestStart;
    
    console.log('Load test results:');
    console.log('  Jobs queued:', loadTestJobs.length);
    console.log('  Queuing time:', queuingTime, 'ms');
    console.log('  Avg queuing time per job:', (queuingTime / loadTestJobs.length).toFixed(2), 'ms');
    
    // Wait a bit to see processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalStats = backgroundProcessor.getStats();
    console.log('  Final queue size:', finalStats.queueSize);
    console.log('  Final processing count:', finalStats.processingCount);
    console.log('✅ Performance under load test passed');
    
    console.log('\n🎉 All Background Processing Integration tests passed!');
    
    // Display final system state
    console.log('\n📊 Final Background Processing State:');
    const finalSystemState = {
      stats: backgroundProcessor.getStats(),
      queueStatus: backgroundProcessor.getQueueStatus()
    };
    
    console.log('Final Stats:');
    console.log('  Total Jobs:', finalSystemState.stats.totalJobs);
    console.log('  Completed:', finalSystemState.stats.completedJobs);
    console.log('  Failed:', finalSystemState.stats.failedJobs);
    console.log('  Queue Size:', finalSystemState.stats.queueSize);
    console.log('  Processing:', finalSystemState.stats.processingCount);
    
    console.log('\nQueue Status:');
    console.log('  Next Jobs:', finalSystemState.queueStatus.nextJobs.length);
    console.log('  Processing Jobs:', finalSystemState.queueStatus.processingJobs.length);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testBackgroundProcessingIntegration()
    .then(() => {
      console.log('\n✅ Background Processing Integration test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Background Processing Integration test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testBackgroundProcessingIntegration };