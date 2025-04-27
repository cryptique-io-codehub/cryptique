const express = require("express");
const { connect } = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const userRouter = require("./routes/userRouter");
const campaignRouter = require("./routes/campaignRouter");
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('Main app environment check:', {
  hasGeminiApi: !!process.env.GEMINI_API,
  nodeEnv: process.env.NODE_ENV,
  envKeys: Object.keys(process.env)
});

// Connect to MongoDB
connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to the database");
});

// Define CORS options for different routes
const mainCorsOptions = {
  origin: ["http://localhost:3000", "https://app.cryptique.io", "https://cryptique.io"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400
};

// SDK CORS configuration with explicit headers
const sdkCorsOptions = {
  origin: '*', // Allow all origins for SDK
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware globally with appropriate configurations
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if(!origin) return callback(null, true);
    
    if(origin.includes('app.cryptique.io') || 
       origin.includes('cryptique.io') || 
       origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  maxAge: 86400
}));

// Global middleware to handle CORS headers more explicitly
app.use((req, res, next) => {
  // Set common security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  const origin = req.headers.origin;
  
  // For SDK routes, use wide open CORS
  if (req.path.startsWith('/api/sdk/')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id');
    res.header('Access-Control-Max-Age', '86400');
  } 
  // For all other routes, use more restrictive CORS
  else if (origin && (origin.includes('app.cryptique.io') || 
             origin.includes('cryptique.io') || 
             origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
  
  next();
});

// Increase JSON body size limit to 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Debug endpoint to check environment variables
app.get("/debug/env", (req, res) => {
  res.json({
    hasGeminiApi: !!process.env.GEMINI_API,
    nodeEnv: process.env.NODE_ENV,
    envCount: Object.keys(process.env).length
  });
});

// Debug endpoint to list all registered routes
app.get("/debug/routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(routes);
});

// Load routes with specific CORS configurations
console.log('Loading routes...');

app.use("/api/auth", userRouter);
app.use("/api/team", require("./routes/teamRouter"));
app.use("/api/sdk", require("./routes/sdkRouter"));
app.use("/api/website", require("./routes/websiteRouter"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/onchain", require("./routes/onChainRouter"));
app.use("/api/campaign", campaignRouter);
app.use("/api/contracts", require("./routes/smartContractRouter"));
app.use("/api/transactions", require("./routes/transactionRouter"));

// Load AI router with explicit error handling
try {
  const aiRouter = require("./routes/aiRouter");
  app.use("/api/ai", aiRouter);
  console.log('AI router loaded successfully at /api/ai');
} catch (error) {
  console.error('Error loading AI router:', error);
}

// Add catch-all route for debugging
app.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query
  });
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});