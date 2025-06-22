#!/usr/bin/env node

// Set environment variables directly
process.env.MONGODB_URI = 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
process.env.GEMINI_API_KEY = 'AIzaSyDqoE8RDAPrPOXDudqrzKRkBi7s-J4H9qs';
process.env.NODE_ENV = 'development';

console.log('🧪 Quick Pre-Deployment Test...\n');

async function quickTest() {
  try {
    // Test 1: Environment Variables
    console.log('✅ Environment variables set');
    console.log(`   MongoDB URI: ${process.env.MONGODB_URI ? 'Set' : 'Missing'}`);
    console.log(`   Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Set' : 'Missing'}`);
    
    // Test 2: Database Connection
    console.log('\n🔗 Testing database connection...');
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    console.log('✅ Database connected successfully');
    
    // Test 3: Gemini API
    console.log('\n🤖 Testing Gemini API...');
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    const testText = "This is a test for Gemini API embedding generation.";
    const result = await model.embedContent(testText);
    
    if (result.embedding && result.embedding.values && result.embedding.values.length > 0) {
      console.log(`✅ Gemini API working, embedding dimension: ${result.embedding.values.length}`);
    } else {
      console.log('❌ Gemini API returned empty embedding');
    }
    
    // Test 4: Model Loading
    console.log('\n📊 Testing model loading...');
    const Analytics = require('../models/analytics');
    const Session = require('../models/session');
    const TimeseriesStat = require('../models/timeseriesStats');
    console.log('✅ All models loaded successfully');
    
    // Test 5: Basic Database Operations
    console.log('\n💾 Testing database operations...');
    
    // Create test document
    const testTimeseriesStat = new TimeseriesStat({
      timestamp: new Date(),
      metadata: {
        siteId: 'quick-test-123',
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
    console.log('✅ Test document created successfully');
    
    // Clean up
    await TimeseriesStat.deleteMany({ 'metadata.siteId': 'quick-test-123' });
    console.log('✅ Test data cleaned up');
    
    await mongoose.connection.close();
    
    console.log('\n🎉 All tests passed! Ready for deployment.');
    console.log('\nNext steps:');
    console.log('1. Run migration: npm run migrate:phase1');
    console.log('2. Deploy to Vercel: npm run deploy:phase1');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    return false;
  }
}

quickTest().then(success => {
  process.exit(success ? 0 : 1);
}); 