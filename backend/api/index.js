const express = require('express');
const cors = require('cors');
const { connectToDatabase } = require('../config/database');

// Import routes
const analyticsRouter = require('../routes/analytics');
const userRouter = require('../routes/userRouter');
const teamRouter = require('../routes/teamRouter');
const websiteRouter = require('../routes/websiteRouter');
const smartContractRouter = require('../routes/smartContractRouter');
const sdkRouter = require('../routes/sdkRouter');
const onChainRouter = require('../routes/onChainRouter');
const campaignRouter = require('../routes/campaignRouter');
const transactionRouter = require('../routes/transactionRouter');
const migrationRouter = require('../routes/migration');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to database
connectToDatabase();

// Routes
app.use('/api/analytics', analyticsRouter);
app.use('/api/users', userRouter);
app.use('/api/teams', teamRouter);
app.use('/api/websites', websiteRouter);
app.use('/api/smartcontracts', smartContractRouter);
app.use('/api/sdk', sdkRouter);
app.use('/api/onchain', onChainRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/migration', migrationRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Export the Express API
module.exports = app; 