/**
 * Health check routes for application monitoring
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * Simple health check endpoint
 * Returns 200 if the server is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Database health check endpoint
 * Checks if the MongoDB connection is active
 */
router.get('/db', async (req, res) => {
  try {
    // Check MongoDB connection state
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
      99: 'uninitialized'
    };

    const status = dbStates[dbState] || 'unknown';
    const isConnected = dbState === 1;

    if (isConnected) {
      // Only perform ping if connected
      // This verifies actual database response, not just the connection state
      const pingResult = await mongoose.connection.db.admin().ping();
      const pingOk = pingResult && pingResult.ok === 1;

      return res.status(200).json({
        status: 'ok',
        database: {
          state: status,
          connected: isConnected,
          ping: pingOk ? 'ok' : 'failed'
        },
        timestamp: new Date().toISOString()
      });
    }

    // If not connected, return appropriate status
    const statusCode = dbState === 2 ? 202 : 503; // 202 if connecting, 503 if disconnected
    res.status(statusCode).json({
      status: statusCode === 202 ? 'initializing' : 'error',
      database: {
        state: status,
        connected: false
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Detailed error for monitoring systems
    res.status(500).json({
      status: 'error',
      database: {
        state: 'error',
        connected: false,
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed health check that includes system info
 * Protected with a simple API key for security
 */
router.get('/details', (req, res) => {
  // Simple API key check to prevent exposing system info
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.HEALTH_CHECK_API_KEY) {
    return res.status(401).json({ status: 'unauthorized' });
  }

  // Get MongoDB connection info
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };

  // Get memory usage
  const memoryUsage = process.memoryUsage();

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      state: dbStates[dbState] || 'unknown',
      connected: dbState === 1,
      name: mongoose.connection.name || 'undefined',
      host: mongoose.connection.host || 'undefined',
      port: mongoose.connection.port || 'undefined'
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      env: process.env.NODE_ENV || 'undefined'
    }
  });
});

module.exports = router; 