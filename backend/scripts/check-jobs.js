const mongoose = require('mongoose');
const EmbeddingJob = require('../models/embeddingJob');
const VectorDocument = require('../models/vectorDocument');

// Set environment variables
process.env.MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';

async function checkJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Checking embedding jobs...');
    const jobs = await EmbeddingJob.find().sort({ createdAt: -1 }).limit(10);
    
    if (jobs.length === 0) {
      console.log('No embedding jobs found');
    } else {
      console.log(`Found ${jobs.length} jobs:`);
      jobs.forEach(job => {
        console.log(`- Job ID: ${job.jobId}`);
        console.log(`  Status: ${job.status}`);
        console.log(`  Progress: ${job.progress.processed}/${job.progress.total}`);
        console.log(`  Created: ${job.createdAt}`);
        console.log('');
      });
    }
    
    console.log('Checking vector documents...');
    const vectorCount = await VectorDocument.countDocuments();
    console.log(`Vector documents count: ${vectorCount}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkJobs(); 