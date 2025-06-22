#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Import models to test
const Analytics = require('../models/analytics');
const Session = require('../models/session');
const TimeseriesStat = require('../models/timeseriesStats');
const User = require('../models/user');
const Team = require('../models/team');
const GranularEvent = require('../models/granularEvents');

class PreDeploymentTest {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    console.log(logMessage);
    
    if (type === 'error') {
      this.errors.push(message);
    }
    
    this.testResults.push({ timestamp, type, message });
  }

  async runAllTests() {
    console.log('🧪 Starting Pre-Deployment Tests for Phase 1...\n');

    try {
      await this.testEnvironmentVariables();
      await this.testDatabaseConnection();
      await this.testGeminiAPI();
      await this.testModelSchemas();
      await this.testDatabaseOperations();
      await this.testVectorService();
      await this.testIndexes();
      await this.generateTestReport();
      
      if (this.errors.length === 0) {
        console.log('\n✅ All tests passed! Ready for deployment.');
        return true;
      } else {
        console.log(`\n❌ ${this.errors.length} test(s) failed. Please fix issues before deployment.`);
        return false;
      }
    } catch (error) {
      this.log(`Critical error during testing: ${error.message}`, 'error');
      return false;
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
      }
    }
  }

  async testEnvironmentVariables() {
    this.log('Testing environment variables...');
    
    const requiredVars = ['MONGODB_URI', 'GEMINI_API_KEY'];
    const missingVars = [];
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else {
        this.log(`✓ ${varName} is set`);
      }
    });
    
    if (missingVars.length > 0) {
      this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
      throw new Error('Missing required environment variables');
    }
    
    this.log('✅ All environment variables are set\n');
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...');
    
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000
      });
      
      this.log('✓ Database connected successfully');
      
      // Test database operations
      const dbName = mongoose.connection.db.databaseName;
      this.log(`✓ Connected to database: ${dbName}`);
      
      // List collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      this.log(`✓ Found ${collections.length} collections in database`);
      
      this.log('✅ Database connection test passed\n');
    } catch (error) {
      this.log(`Database connection failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async testGeminiAPI() {
    this.log('Testing Gemini API connection...');
    
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      // Test with a simple text
      const testText = "This is a test for Gemini API embedding generation.";
      const result = await model.embedContent(testText);
      
      if (result.embedding && result.embedding.values && result.embedding.values.length > 0) {
        this.log(`✓ Gemini API working, embedding dimension: ${result.embedding.values.length}`);
        this.log('✅ Gemini API test passed\n');
      } else {
        this.log('Gemini API returned empty embedding', 'error');
      }
    } catch (error) {
      this.log(`Gemini API test failed: ${error.message}`, 'error');
      this.log('⚠️  Vector operations will be disabled in production');
    }
  }

  async testModelSchemas() {
    this.log('Testing model schemas...');
    
    const models = [
      { name: 'Analytics', model: Analytics },
      { name: 'Session', model: Session },
      { name: 'TimeseriesStat', model: TimeseriesStat },
      { name: 'User', model: User },
      { name: 'Team', model: Team },
      { name: 'GranularEvent', model: GranularEvent }
    ];
    
    for (const { name, model } of models) {
      try {
        // Test model instantiation
        const testDoc = new model({});
        this.log(`✓ ${name} model instantiated successfully`);
        
        // Test schema validation
        const validationError = testDoc.validateSync();
        if (validationError) {
          // This is expected for required fields, so we just log it
          this.log(`✓ ${name} model has proper validation rules`);
        }
      } catch (error) {
        this.log(`${name} model test failed: ${error.message}`, 'error');
      }
    }
    
    this.log('✅ Model schema tests completed\n');
  }

  async testDatabaseOperations() {
    this.log('Testing basic database operations...');
    
    try {
      // Test TimeseriesStat creation
      const testTimeseriesStat = new TimeseriesStat({
        timestamp: new Date(),
        metadata: {
          siteId: 'test-site-123',
          granularity: 'hourly',
          timezone: 'UTC'
        },
        metrics: {
          visitors: 10,
          uniqueVisitors: 8,
          web3Users: 2,
          pageViews: 15
        }
      });
      
      await testTimeseriesStat.save();
      this.log('✓ TimeseriesStat document created successfully');
      
      // Test aggregation
      const aggregationResult = await TimeseriesStat.aggregateByPeriod(
        'test-site-123',
        'hourly',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );
      this.log(`✓ TimeseriesStat aggregation working, returned ${aggregationResult.length} results`);
      
      // Test Analytics operations
      const testAnalytics = new Analytics({
        siteId: 'test-site-123',
        websiteUrl: 'https://test.example.com',
        summaryMetrics: {
          totalVisitors: 100,
          uniqueVisitors: 80,
          web3Visitors: 20
        }
      });
      
      await testAnalytics.save();
      this.log('✓ Analytics document created successfully');
      
      // Test Session operations
      const testSession = new Session({
        sessionId: 'test-session-123',
        userId: 'test-user-123',
        siteId: 'test-site-123',
        startTime: new Date(),
        pagesViewed: 3,
        duration: 180,
        country: 'US',
        browser: { name: 'Chrome', version: '120' },
        device: { type: 'desktop', os: 'Windows' }
      });
      
      await testSession.save();
      this.log('✓ Session document created successfully');
      
      // Clean up test data
      await TimeseriesStat.deleteMany({ 'metadata.siteId': 'test-site-123' });
      await Analytics.deleteMany({ siteId: 'test-site-123' });
      await Session.deleteMany({ siteId: 'test-site-123' });
      this.log('✓ Test data cleaned up');
      
      this.log('✅ Database operations test passed\n');
    } catch (error) {
      this.log(`Database operations test failed: ${error.message}`, 'error');
    }
  }

  async testVectorService() {
    this.log('Testing vector service...');
    
    try {
      const vectorService = require('../services/vectorService');
      const status = vectorService.getStatus();
      
      this.log(`✓ Vector service status: ${JSON.stringify(status)}`);
      
      if (status.isInitialized) {
        // Test embedding generation
        const testText = "This is a test document for vector embedding.";
        const embedding = await vectorService.generateEmbedding(testText);
        
        if (embedding && embedding.length > 0) {
          this.log(`✓ Vector embedding generated successfully, dimension: ${embedding.length}`);
          
          // Test similarity calculation
          const similarity = vectorService.calculateCosineSimilarity(embedding, embedding);
          if (Math.abs(similarity - 1.0) < 0.001) {
            this.log('✓ Cosine similarity calculation working correctly');
          } else {
            this.log(`Cosine similarity test failed: expected 1.0, got ${similarity}`, 'error');
          }
        } else {
          this.log('Vector embedding generation failed', 'error');
        }
      } else {
        this.log('⚠️  Vector service not initialized (Gemini API key issue)');
      }
      
      this.log('✅ Vector service test completed\n');
    } catch (error) {
      this.log(`Vector service test failed: ${error.message}`, 'error');
    }
  }

  async testIndexes() {
    this.log('Testing database indexes...');
    
    try {
      // Check indexes for each collection
      const collections = [
        { name: 'analytics', model: Analytics },
        { name: 'sessions', model: Session },
        { name: 'timeseriesstats', model: TimeseriesStat },
        { name: 'users', model: User },
        { name: 'teams', model: Team },
        { name: 'granularevents', model: GranularEvent }
      ];
      
      for (const { name, model } of collections) {
        try {
          const indexes = await model.collection.getIndexes();
          const indexCount = Object.keys(indexes).length;
          this.log(`✓ ${name} collection has ${indexCount} indexes`);
        } catch (error) {
          this.log(`Could not check indexes for ${name}: ${error.message}`, 'error');
        }
      }
      
      this.log('✅ Index check completed\n');
    } catch (error) {
      this.log(`Index test failed: ${error.message}`, 'error');
    }
  }

  async generateTestReport() {
    this.log('Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: this.testResults.length,
      errors: this.errors.length,
      warnings: this.testResults.filter(r => r.type === 'warning').length,
      success: this.errors.length === 0,
      environment: {
        nodeVersion: process.version,
        mongooseVersion: mongoose.version,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasMongoDB: !!process.env.MONGODB_URI
      },
      errors: this.errors,
      recommendations: this.generateRecommendations()
    };
    
    // Write report to file
    const fs = require('fs');
    const path = require('path');
    const reportPath = path.join(__dirname, `test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 Test report written to: ${reportPath}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.errors.length > 0) {
      recommendations.push('Fix all errors before deploying to production');
    }
    
    if (!process.env.GEMINI_API_KEY) {
      recommendations.push('Set GEMINI_API_KEY for vector operations');
    }
    
    if (process.env.NODE_ENV !== 'production') {
      recommendations.push('Set NODE_ENV=production for production deployment');
    }
    
    recommendations.push('Run migration script before first deployment');
    recommendations.push('Monitor application performance after deployment');
    recommendations.push('Set up proper logging and error tracking');
    
    return recommendations;
  }
}

// CLI interface
async function runTests() {
  const tester = new PreDeploymentTest();
  const success = await tester.runAllTests();
  
  if (success) {
    console.log('\n🎉 All tests passed! You can proceed with deployment.');
    console.log('\nNext steps:');
    console.log('1. Run migration: npm run migrate:phase1');
    console.log('2. Deploy to Vercel: npm run deploy:phase1');
    console.log('3. Test production endpoints');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed. Please fix issues before deployment.');
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = PreDeploymentTest;

// Run if called directly
if (require.main === module) {
  runTests();
} 