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
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Stripe routes
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

// Special route handling for Stripe webhooks (needs raw body)
// IMPORTANT: This is the STANDARDIZED webhook endpoint for Stripe
// All Stripe webhook events should be configured to send to this endpoint:
// https://cryptique-backend.vercel.app/api/webhooks/stripe
const stripeWebhookRoutes = require('./routes/webhooks/stripe');
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

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
      stripe: '/api/stripe/*',
      webhooks: '/api/webhooks/*',
      health: '/api/health'
    },
    env: {
      backend_url: process.env.REACT_APP_API_SERVER_URL || 'Not configured'
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