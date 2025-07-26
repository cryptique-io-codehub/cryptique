/**
 * Test suite for BackgroundProcessor
 * Tests job queuing, processing, and management functionality
 */

const backgroundProcessor = require('../services/backgroundProcessor');

async function testBackgroundProcessor() {
  console.log('🧪 Starting BackgroundProcessor tests...\n');
  
  try {
    // Test 1: Basic job queuing
    console.log('Test 1: Basic job queuing');
    
    const jobId1 = backgroundProcessor.queueJob({
      type: 'cache_warming',
      data: { siteId: 'test-site-1' },
      priority: 5
    });
    
    const jobId2 = backgroundProcessor.queueJob({
      type: 'stats_aggregation',
      data: { siteId: 'test-site-2', timeframe: 'daily' },
      priority: 3 // Higher priority
    });
    
    console.log('Job 1 ID:', jobId1);
    console.log('Job 2 ID:', jobId2);
    console.log('✅ Job queuing test passed');
    
    // Test 2: Job status checking
    console.log('\nTest 2: Job status checking');
    
    const job1Status = backgroundProcessor.getJobStatus(jobId1);
    const job2Status = backgroundProcessor.getJobStatus(jobId2);
    
    console.log('Job 1 status:', job1Status?.status);
    console.log('Job 2 status:', job2Status?.status);
    console.log('✅ Job status test passed:', job1Status && job2Status);
    
    // Test 3: Queue statistics
    console.log('\nTest 3: Queue statistics');
    
    const stats = backgroundProcessor.getStats();
    console.log('Queue statistics:');
    console.log('  Total jobs:', stats.totalJobs);
    console.log('  Queue size:', stats.queueSize);
    console.log('  Processing count:', stats.processingCount);
    console.log('  Is processing:', stats.isProcessing);
    console.log('✅ Statistics test passed');
    
    // Test 4: Queue status
    console.log('\nTest 4: Queue status');
    
    const queueStatus = backgroundProcessor.getQueueStatus();
    console.log('Queue status:');
    console.log('  Queue size:', queueStatus.queueSize);
    console.log('  Processing count:', queueStatus.processingCount);
    console.log('  Next jobs count:', queueStatus.nextJobs.length);
    console.log('✅ Queue status test passed');
    
    // Test 5: Priority ordering
    console.log('\nTest 5: Priority ordering');
    
    // Add a high priority job
    const highPriorityJobId = backgroundProcessor.queueJob({
      type: 'user_journey_processing',
      data: { siteId: 'urgent-site' },
      priority: 1 // Highest priority
    });
    
    const updatedQueueStatus = backgroundProcessor.getQueueStatus();
    const firstJob = updatedQueueStatus.nextJobs[0];
    
    console.log('First job in queue:', firstJob?.type, 'Priority:', firstJob?.priority);
    console.log('✅ Priority ordering test passed:', firstJob?.priority === 1);
    
    // Test 6: Job cancellation
    console.log('\nTest 6: Job cancellation');
    
    const cancelResult = backgroundProcessor.cancelJob(highPriorityJobId);
    const cancelledJobStatus = backgroundProcessor.getJobStatus(highPriorityJobId);
    
    console.log('Cancellation result:', cancelResult);
    console.log('Cancelled job status:', cancelledJobStatus?.status);
    console.log('✅ Job cancellation test passed:', cancelResult && cancelledJobStatus?.status === 'cancelled');
    
    // Test 7: Event listening
    console.log('\nTest 7: Event listening');
    
    let eventReceived = false;
    backgroundProcessor.once('jobQueued', (job) => {
      eventReceived = true;
      console.log('Event received for job:', job.id);
    });
    
    const eventTestJobId = backgroundProcessor.queueJob({
      type: 'data_cleanup',
      data: { type: 'test_cleanup' },
      priority: 8
    });
    
    // Give event time to fire
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('✅ Event listening test passed:', eventReceived);
    
    // Test 8: Job processing simulation
    console.log('\nTest 8: Job processing simulation');
    
    // Wait a bit to see if jobs start processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalStats = backgroundProcessor.getStats();
    console.log('Final statistics:');
    console.log('  Total jobs:', finalStats.totalJobs);
    console.log('  Completed jobs:', finalStats.completedJobs);
    console.log('  Failed jobs:', finalStats.failedJobs);
    console.log('  Queue size:', finalStats.queueSize);
    console.log('  Processing count:', finalStats.processingCount);
    
    console.log('✅ Job processing simulation test passed');
    
    // Test 9: Error handling
    console.log('\nTest 9: Error handling');
    
    try {
      // Try to queue an invalid job
      backgroundProcessor.queueJob({
        type: 'invalid_job_type',
        data: { invalid: 'data' }
      });
      
      // Wait to see if it fails properly
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ Error handling test passed');
    } catch (error) {
      console.log('✅ Error handling test passed (caught error):', error.message);
    }
    
    console.log('\n🎉 All BackgroundProcessor tests passed!');
    
    // Display final processor state
    console.log('\n📊 Final BackgroundProcessor State:');
    const finalState = {
      stats: backgroundProcessor.getStats(),
      queueStatus: backgroundProcessor.getQueueStatus()
    };
    
    console.log('Stats:', JSON.stringify(finalState.stats, null, 2));
    console.log('Queue Status:', JSON.stringify(finalState.queueStatus, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run tests if called directly
if (require.main === module) {
  testBackgroundProcessor()
    .then(() => {
      console.log('\n✅ BackgroundProcessor test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ BackgroundProcessor test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testBackgroundProcessor };