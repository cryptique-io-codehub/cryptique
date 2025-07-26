/**
 * Server Startup Script
 * Validates environment and starts the optimized server
 */

const fs = require('fs');
const path = require('path');

async function startServer() {
  console.log('🚀 Starting MongoDB Performance Optimized Server...\n');

  try {
    // Load environment variables
    require('dotenv').config();
    
    // 1. Check environment variables
    console.log('🔍 Checking environment configuration...');
    const requiredEnvVars = [
      'MONGODB_URI',
      'MONGODB_DATABASE',
      'JWT_SECRET',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing environment variables:', missingVars.join(', '));
      console.log('📝 Please check your .env file');
    } else {
      console.log('✅ All required environment variables are set');
    }

    // 2. Check if optimization files exist
    console.log('\n🔍 Checking optimization files...');
    const optimizationFiles = [
      'services/cacheService.js',
      'services/backgroundProcessor.js',
      'services/statsAggregationService.js',
      'services/queryOptimizer.js',
      'models/aggregatedStats.js',
      'routes/statsAggregationRouter.js',
      'middleware/cacheMiddleware.js'
    ];

    const missingFiles = optimizationFiles.filter(file => 
      !fs.existsSync(path.join(__dirname, '..', file))
    );

    if (missingFiles.length > 0) {
      console.log('❌ Missing optimization files:', missingFiles.join(', '));
      throw new Error('Required optimization files are missing');
    } else {
      console.log('✅ All optimization files are present');
    }

    // 3. Start the server
    console.log('\n🌐 Starting Express server...');
    require('../index.js');

  } catch (error) {
    console.error('\n❌ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = { startServer };