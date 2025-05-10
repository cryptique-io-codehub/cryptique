const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const userRouter = require("./routes/userRouter");
const campaignRouter = require("./routes/campaignRouter");
const stripeRouter = require("./routes/stripeRouter");
const bodyParser = require("body-parser");
const { apiLimiter } = require("./middleware/rateLimiter");
const { connectToDatabase } = require("./config/database");
const healthRouter = require("./routes/healthRouter");
const app = express();
const PORT = process.env.PORT || 3001;

// Debug environment variables
console.log('Main app environment check:', {
  hasGeminiApi: !!process.env.GEMINI_API,
  nodeEnv: process.env.NODE_ENV,
  envKeys: Object.keys(process.env)
});

// Connect to MongoDB using secure configuration
connectToDatabase()
  .then(() => {
    console.log('MongoDB connection established successfully');
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err);
    process.exit(1); // Exit on database connection failure
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
  origin: function(origin, callback) {
    // Allow specific origins instead of wildcard
    const allowedOrigins = ['https://app.cryptique.io', 'https://cryptique.io', 'http://localhost:3000'];
    
    // Check if origin is in our allowed list or if it's not provided (like in REST clients)
    const originAllowed = !origin || allowedOrigins.includes(origin);
    
    if (originAllowed) {
      callback(null, origin);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-cryptique-site-id'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true, // Changed to true to allow credentials
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Parse cookies
app.use(cookieParser());

// Use Helmet for security headers (except for SDK routes)
app.use((req, res, next) => {
  // Skip Helmet for SDK routes which need to be accessible from any origin
  if (req.path.startsWith('/api/sdk/')) {
    return next();
  }
  
  // Apply Helmet middleware for all other routes
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://app.cryptique.io", "https://cryptique.io"],
        connectSrc: ["'self'", "https://api.cryptique.io", "https://cryptique-backend.vercel.app", "https://ipinfo.io", "*"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    // Enable other security features
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    }
  })(req, res, next);
});

// We'll handle CORS per-route instead of globally
// This prevents conflicts between different CORS policies

// Global middleware to handle CORS headers more explicitly
app.use((req, res, next) => {
  // Set common security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  const origin = req.headers.origin;
  
  // For SDK routes, use origin-specific CORS instead of wide open
  if (req.path.startsWith('/api/sdk/')) {
    const allowedOrigins = ['https://app.cryptique.io', 'https://cryptique.io', 'http://localhost:3000'];
    
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Max-Age', '86400');
    }
    
    // Handle preflight OPTIONS requests for SDK routes immediately
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
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

// Apply general rate limiting to all routes except SDK routes
app.use('/api', (req, res, next) => {
  // Skip rate limiting for SDK routes which need to handle many requests
  if (req.path.startsWith('/sdk/')) {
    return next();
  }
  
  // Apply rate limiting for all other API routes
  apiLimiter(req, res, next);
});

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

// Health check routes - minimal CORS and no rate limiting
app.use("/health", healthRouter);

// Stripe routes
app.use("/api/stripe", stripeRouter);

// Apply specific CORS for SDK routes
app.use("/api/sdk", require("./routes/sdkRouter"));  // Removed cors(sdkCorsOptions) to use the router's own settings

// Apply main CORS for all other routes
app.use("/api/auth", cors(mainCorsOptions), userRouter);
app.use("/api/team", cors(mainCorsOptions), require("./routes/teamRouter"));
app.use("/api/website", cors(mainCorsOptions), require("./routes/websiteRouter"));
app.use("/api/analytics", cors(mainCorsOptions), require("./routes/analytics"));
app.use("/api/onchain", cors(mainCorsOptions), require("./routes/onChainRouter"));
app.use("/api/campaign", cors(mainCorsOptions), campaignRouter);
app.use("/api/contracts", cors(mainCorsOptions), require("./routes/smartContractRouter"));
app.use("/api/transactions", cors(mainCorsOptions), require("./routes/transactionRouter"));

// Load AI router with explicit error handling
try {
  const aiRouter = require("./routes/aiRouter");
  app.use("/api/ai", aiRouter);  // Removed cors(mainCorsOptions) to use the router's own CORS settings
  console.log('AI router loaded successfully at /api/ai');
} catch (error) {
  console.error('Error loading AI router:', error);
  
  // Create a fallback router that returns appropriate errors
  const fallbackRouter = express.Router();
  
  // Configure CORS for the fallback router
  fallbackRouter.use(cors({
    origin: ['http://localhost:3000', 'https://app.cryptique.io', 'https://cryptique.io'],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  }));
  
  // Add fallback routes for the main AI endpoints
  fallbackRouter.get('/models', (req, res) => {
    res.status(503).json({
      error: 'AI service temporarily unavailable',
      details: 'The AI service is currently unavailable. Please try again later.'
    });
  });
  
  fallbackRouter.post('/generate', (req, res) => {
    res.status(503).json({
      error: 'AI service temporarily unavailable',
      details: 'The AI service is currently unavailable. Please try again later.'
    });
  });
  
  // Add the fallback router
  app.use("/api/ai", fallbackRouter);
  console.log('Fallback AI router loaded');
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