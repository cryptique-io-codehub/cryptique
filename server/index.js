const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const createRateLimiter = require('./middleware/rateLimiter');
const cluster = require('cluster');
const { getConfig } = require('./config/architecture');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Get architecture configuration
const config = getConfig();

const app = express();

// Initialize rate limiters
const rateLimiters = createRateLimiter();

// CORS configuration - Updated to allow requests from any origin during development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://app.cryptique.io'] 
    : '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply standard rate limiting to all routes by default
app.use(rateLimiters.standard);

// Connect to MongoDB with enhanced configuration
connectDB()
  .then(() => {
    console.log('MongoDB connection initialized with pooling and high availability options');
  })
  .catch(err => {
    console.error('Failed to initialize MongoDB connection:', err);
    process.exit(1);
  });

// Setup health check endpoint (no rate limiting) - critical for load balancers
app.get('/api/health', (req, res) => {
  // Include worker information in clustered environment
  const health = {
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    pid: process.pid,
    worker: cluster.isWorker ? {
      id: cluster.worker?.id,
      pid: process.pid
    } : null,
    memory: process.memoryUsage()
  };
  
  // Check MongoDB connection
  health.database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.json(health);
});

// Routes
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// Stripe routes with authentication rate limiting
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', rateLimiters.sensitive, stripeRoutes);

// Usage routes for tracking and managing subscription limits
const usageRoutes = require('./routes/usage');
app.use('/api/usage', usageRoutes);

// Team routes for managing teams and team members
const teamRoutes = require('./routes/teams');
app.use('/api/teams', teamRoutes);

// Website routes for managing websites
const websiteRoutes = require('./routes/websites');
app.use('/api/websites', websiteRoutes);

// Smart contract routes for managing smart contracts
const smartContractRoutes = require('./routes/smartContracts');
app.use('/api/smart-contracts', smartContractRoutes);

// Data retention routes
const retentionRoutes = require('./routes/retention');
app.use('/api/retention', rateLimiters.sensitive, retentionRoutes);

// Admin routes for managing enterprise configurations
const enterpriseConfigRoutes = require('./routes/admin/enterpriseConfig');
app.use('/api/admin/enterprise', rateLimiters.sensitive, enterpriseConfigRoutes);

// Architecture monitoring routes - for internal/admin use only
app.use('/api/admin/architecture', rateLimiters.sensitive, (req, res) => {
  res.json({
    success: true,
    config: {
      mode: config.mode,
      loadBalancing: config.loadBalancing,
      features: config.features,
      circuitBreaker: config.circuitBreaker
    },
    worker: cluster.isWorker ? {
      id: cluster.worker?.id,
      pid: process.pid
    } : null
  });
});

// Task management routes - for monitoring and controlling tasks
app.use('/api/admin/tasks', rateLimiters.sensitive, (req, res) => {
  const { taskOrchestrator } = require('./services/taskOrchestratorService');
  
  res.json({
    success: true,
    metrics: taskOrchestrator.getMetrics(),
    activeTasks: taskOrchestrator.getActiveTasks(),
    config: {
      executorMode: process.env.TASK_EXECUTOR_MODE || 'child_process',
      maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '2', 10),
      enableResourceControl: process.env.ENABLE_RESOURCE_CONTROL !== 'false'
    }
  });
});

// Special route handling for Stripe webhooks (needs raw body)
// IMPORTANT: This is the STANDARDIZED webhook endpoint for Stripe
// All Stripe webhook events should be configured to send to this endpoint:
// https://cryptique-backend.vercel.app/api/webhooks/stripe
// No rate limiting for webhook endpoints as they are called by external services
const stripeWebhookRoutes = require('./routes/webhooks/stripe');
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cryptique Analytics API Server',
    version: process.env.npm_package_version || require('./package.json').version,
    endpoints: {
      analytics: '/api/analytics/*',
      stripe: '/api/stripe/*',
      usage: '/api/usage/*',
      teams: '/api/teams/*',
      websites: '/api/websites/*',
      smartContracts: '/api/smart-contracts/*',
      retention: '/api/retention/*',
      admin: '/api/admin/*',
      webhooks: '/api/webhooks/*',
      health: '/api/health'
    },
    architecture: {
      mode: config.mode,
      clustered: cluster.isWorker
    },
    server: {
      pid: process.pid,
      worker: cluster.isWorker ? cluster.worker.id : null,
      uptime: process.uptime()
    }
  });
});

// Generic error handling middleware with improved details
app.use((err, req, res, next) => {
  console.error(`Error processing ${req.method} ${req.path}:`, err);
  
  // Determine appropriate status code
  let statusCode = err.statusCode || 500;
  
  // Structure error response
  const errorResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'An error occurred while processing your request' 
      : err.message || 'Unknown error',
    code: err.code || 'INTERNAL_ERROR'
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    errorResponse.stack = err.stack;
  }
  
  res.status(statusCode).json(errorResponse);
});

// Initialize scheduled tasks
// In production, this would be handled by a separate process or cron job
// For development, we'll just log that it needs to be set up
if (process.env.ENABLE_SCHEDULED_TASKS === 'true') {
  const { setupScheduledTasks } = require('./tasks/scheduledTasks');
  setupScheduledTasks();
  console.log('Scheduled tasks initialized');
} else {
  console.log('Note: Scheduled tasks are disabled. Set ENABLE_SCHEDULED_TASKS=true to enable them.');
  console.log('       Alternatively, run them manually with: npm run tasks');
}

// Initialize task orchestrator
const { taskOrchestrator } = require('./services/taskOrchestratorService');
console.log(`Task orchestrator initialized in ${taskOrchestrator.executorMode} mode`);

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  const workerInfo = cluster.isWorker ? `Worker ${cluster.worker.id} (PID: ${process.pid})` : `PID: ${process.pid}`;
  console.log(`Server is running on port ${PORT} [${workerInfo}]`);
  console.log(`Architecture mode: ${config.mode}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
});

module.exports = app; 