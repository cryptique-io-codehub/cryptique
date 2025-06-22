// Test database connection
require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...');
    
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://devs:62DVg3eFu10gvUIB@cluster0.vc5dz.mongodb.net/Cryptique-Test-Server';
    console.log('📍 MongoDB URI:', mongoUri.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connection successful!');
    
    // Test basic query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Available collections:', collections.map(c => c.name));
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('IP')) {
      console.log('\n🚨 IP Whitelisting Issue Detected!');
      console.log('📋 Solutions:');
      console.log('1. Add your current IP to MongoDB Atlas whitelist');
      console.log('2. Add 0.0.0.0/0 to allow all IPs (temporary)');
      console.log('3. Run migration in production (Vercel) where IP restrictions don\'t apply');
    }
  }
}

testConnection(); 