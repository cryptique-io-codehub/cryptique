const express = require('express');
const router = express.Router();

// Import the migration class
const Phase1Migration = require('../scripts/migration/phase1Migration');

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN || 'cryptique-admin-2024';
  
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Admin token required' 
    });
  }
  
  next();
};

// GET /api/migration/status - Check migration status
router.get('/status', adminAuth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const TimeseriesStat = require('../models/timeseriesStats');
    
    // Check if migration has been run
    const timeseriesCount = await TimeseriesStat.countDocuments({});
    const hasMigrated = timeseriesCount > 0;
    
    res.json({
      success: true,
      migrationStatus: hasMigrated ? 'completed' : 'pending',
      timeseriesRecords: timeseriesCount,
      database: mongoose.connection.db.databaseName,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message,
      migrationStatus: 'error'
    });
  }
});

// POST /api/migration/run - Run Phase 1 migration
router.post('/run', adminAuth, async (req, res) => {
  try {
    console.log('Starting Phase 1 migration...');
    
    const migration = new Phase1Migration();
    const result = await migration.run();
    
    console.log('Migration completed successfully');
    
    res.json({
      success: true,
      message: 'Phase 1 migration completed successfully',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Migration failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Migration failed',
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/migration/rollback - Rollback migration (if needed)
router.post('/rollback', adminAuth, async (req, res) => {
  try {
    console.log('Starting migration rollback...');
    
    const migration = new Phase1Migration();
    const result = await migration.rollback();
    
    console.log('Rollback completed successfully');
    
    res.json({
      success: true,
      message: 'Migration rollback completed successfully',
      result: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rollback failed:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Rollback failed',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/migration/health - Health check for migration system
router.get('/health', async (req, res) => {
  try {
    const mongoose = require('mongoose');
    
    // Check database connection
    const dbStatus = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Check if required models are available
    const modelsStatus = {
      Analytics: !!require('../models/analytics'),
      Session: !!require('../models/session'),
      TimeseriesStat: !!require('../models/timeseriesStats'),
      User: !!require('../models/user'),
      Team: !!require('../models/team'),
      GranularEvent: !!require('../models/granularEvents')
    };
    
    // Check environment variables
    const envStatus = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      NODE_ENV: process.env.NODE_ENV || 'development'
    };
    
    res.json({
      success: true,
      status: 'healthy',
      database: {
        status: dbStates[dbStatus] || 'unknown',
        name: mongoose.connection.db?.databaseName || 'unknown'
      },
      models: modelsStatus,
      environment: envStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 