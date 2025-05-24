const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/database');
const createRateLimiter = require('./middleware/rateLimiter');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

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

// Special route handling for Stripe webhooks (needs raw body)
// IMPORTANT: This is the STANDARDIZED webhook endpoint for Stripe
// All Stripe webhook events should be configured to send to this endpoint:
// https://cryptique-backend.vercel.app/api/webhooks/stripe
// No rate limiting for webhook endpoints as they are called by external services
const stripeWebhookRoutes = require('./routes/webhooks/stripe');
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cryptique Analytics API Server',
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
    env: {
      backend_url: process.env.REACT_APP_API_SERVER_URL || 'Not configured'
    }
  });
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Backend API URL: ${process.env.BACKEND_API_URL || 'Not configured'}`);
}); 