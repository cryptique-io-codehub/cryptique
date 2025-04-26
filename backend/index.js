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
  origin: ["http://localhost:3000", "https://app.cryptique.io"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
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

// Global middleware to handle OPTIONS requests
app.options('*', (req, res, next) => {
  if (req.path.startsWith('/api/sdk/')) {
    cors(sdkCorsOptions)(req, res, next);
  } else {
    cors(mainCorsOptions)(req, res, next);
  }
});

// Apply CORS configuration based on route
app.use((req, res, next) => {
  // Set common security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  if (req.path.startsWith('/api/sdk/')) {
    cors(sdkCorsOptions)(req, res, next);
  } else {
    // For all other routes, including analytics
    const origin = req.headers.origin;
    if (mainCorsOptions.origin.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', mainCorsOptions.methods.join(', '));
      res.header('Access-Control-Allow-Headers', mainCorsOptions.allowedHeaders.join(', '));
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', mainCorsOptions.maxAge.toString());
    }
    next();
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
app.use("/api/transactions", require("./routes/transactions"));

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