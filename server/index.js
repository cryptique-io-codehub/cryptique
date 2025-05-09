const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// CORS configuration - Updated to allow requests from any origin during development
app.use(cors({
  origin: '*', // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CC-Webhook-Signature'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Special middleware for Coinbase webhooks that need raw body
app.use('/api/coinbase/webhook', express.raw({ type: 'application/json' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptique', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
const analyticsRoutes = require('./routes/analytics');
app.use('/api/analytics', analyticsRoutes);

// Add Zoho CRM routes
const zohoRoutes = require('./routes/zoho');
app.use('/api/zoho', zohoRoutes);

// Add Coinbase Commerce routes
const coinbaseRoutes = require('./routes/coinbase');
app.use('/api/coinbase', coinbaseRoutes);

// Add Plans routes
const plansRoutes = require('./routes/plans');
app.use('/api/plans', plansRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cryptique Analytics API Server',
    endpoints: {
      analytics: '/api/analytics/*',
      zoho: '/api/zoho/*',
      coinbase: '/api/coinbase/*',
      health: '/api/health'
    },
    env: {
      backend_url: process.env.BACKEND_API_URL || 'Not configured'
    }
  });
});

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