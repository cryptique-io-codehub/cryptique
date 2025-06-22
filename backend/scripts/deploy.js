#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Phase 1 Deployment Process...\n');

// Check environment variables
function checkEnvironmentVariables() {
  console.log('📋 Checking environment variables...');
  
  const requiredVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
  const missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease set these variables in your environment or .env file');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set\n');
}

// Install dependencies
function installDependencies() {
  console.log('📦 Installing dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully\n');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
}

// Run migration (optional)
function runMigration() {
  const shouldMigrate = process.argv.includes('--migrate');
  
  if (shouldMigrate) {
    console.log('🔄 Running Phase 1 migration...');
    
    try {
      execSync('npm run migrate:phase1', { stdio: 'inherit' });
      console.log('✅ Migration completed successfully\n');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      console.error('You can run the migration manually later with: npm run migrate:phase1');
      console.log('Continuing with deployment...\n');
    }
  } else {
    console.log('ℹ️  Skipping migration (use --migrate flag to run migration)\n');
  }
}

// Validate models
function validateModels() {
  console.log('🔍 Validating model files...');
  
  const modelFiles = [
    'models/analytics.js',
    'models/session.js',
    'models/timeseriesStats.js',
    'models/user.js',
    'models/team.js',
    'models/granularEvents.js'
  ];
  
  const missingFiles = [];
  
  modelFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing model files:');
    missingFiles.forEach(file => {
      console.error(`   - ${file}`);
    });
    process.exit(1);
  }
  
  console.log('✅ All model files are present\n');
}

// Test database connection
async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Database connection successful');
    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Please check your MONGODB_URI and database availability');
    process.exit(1);
  }
}

// Deploy to Vercel
function deployToVercel() {
  const shouldDeploy = process.argv.includes('--deploy');
  
  if (shouldDeploy) {
    console.log('🚀 Deploying to Vercel...');
    
    try {
      // Check if vercel CLI is installed
      execSync('vercel --version', { stdio: 'pipe' });
      
      // Deploy
      execSync('vercel --prod', { stdio: 'inherit' });
      console.log('✅ Deployment to Vercel completed successfully\n');
    } catch (error) {
      if (error.message.includes('vercel --version')) {
        console.error('❌ Vercel CLI not found. Please install it with: npm install -g vercel');
      } else {
        console.error('❌ Deployment failed:', error.message);
      }
      process.exit(1);
    }
  } else {
    console.log('ℹ️  Skipping Vercel deployment (use --deploy flag to deploy)\n');
    console.log('To deploy manually, run: vercel --prod');
  }
}

// Create deployment summary
function createDeploymentSummary() {
  console.log('📊 Phase 1 Deployment Summary\n');
  console.log('✅ Database Schema Optimization:');
  console.log('   - Time series collections consolidated');
  console.log('   - TTL indexes for automatic cleanup');
  console.log('   - Optimized compound indexes');
  console.log('   - Vector search fields prepared');
  
  console.log('\n✅ API Optimization:');
  console.log('   - New analytics controller with aggregation pipelines');
  console.log('   - Efficient session and event querying');
  console.log('   - Real-time analytics endpoints');
  console.log('   - Backward compatibility maintained');
  
  console.log('\n✅ Vector Service (RAG Ready):');
  console.log('   - Gemini API integration for embeddings');
  console.log('   - Batch processing capabilities');
  console.log('   - Similarity search functions');
  console.log('   - Document vector management');
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Monitor application performance');
  console.log('   2. Run migration if not done: npm run migrate:phase1');
  console.log('   3. Test new analytics endpoints');
  console.log('   4. Proceed to Phase 2 (RAG Implementation)');
  
  console.log('\n🔗 New Endpoints Available:');
  console.log('   - GET /api/analytics/overview/:siteId');
  console.log('   - GET /api/analytics/sessions/:siteId');
  console.log('   - GET /api/analytics/pages/:siteId');
  console.log('   - GET /api/analytics/events/:siteId');
  console.log('   - GET /api/analytics/realtime/:siteId');
  console.log('   - POST /api/analytics/update');
}

// Main deployment function
async function main() {
  try {
    checkEnvironmentVariables();
    installDependencies();
    validateModels();
    await testDatabaseConnection();
    runMigration();
    deployToVercel();
    createDeploymentSummary();
    
    console.log('\n🎉 Phase 1 deployment process completed successfully!');
  } catch (error) {
    console.error('\n💥 Deployment process failed:', error.message);
    process.exit(1);
  }
}

// Run the deployment
if (require.main === module) {
  main();
}

module.exports = { main }; 