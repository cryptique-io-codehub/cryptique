const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const bodyParser = require("body-parser");
const { apiLimiter } = require("./middleware/rateLimiter");
const { connectToDatabase } = require("./config/database");
const healthRouter = require("./routes/healthRouter");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Team = require("./models/team");
const app = express();
const PORT = process.env.PORT || 3001;

// Import all routers in one place to avoid duplicates
const userRouter = require("./routes/userRouter");
const campaignRouter = require("./routes/campaignRouter");
const stripeRouter = require("./routes/stripeRouter");
const teamRouter = require("./routes/teamRouter");
const websiteRouter = require("./routes/websiteRouter");
const analyticsRouter = require("./routes/analyticsRouter");
const dashboardRouter = require("./routes/dashboardRouter");
const transactionRouter = require("./routes/transactionRouter");
const contractRouter = require("./routes/smartContractRouter");
const sdkRouter = require("./routes/sdkRouter");
const chatRouter = require("./routes/chatRouter");
const paymentRouter = require("./routes/paymentRouter");
const eventRouter = require("./routes/eventRouter");

// Check if auth router exists before importing
let authRouter;
try {
  authRouter = require("./routes/authRouter");
} catch (error) {
  console.warn("authRouter module not found. Using userRouter for /api/auth route instead.");
  authRouter = userRouter; // Fallback to userRouter if authRouter doesn't exist
}

// Set trust proxy to true for Vercel/AWS Lambda environments
app.set('trust proxy', 1);

// Special route handling for Stripe webhooks (needs raw body)
// IMPORTANT: This must be defined BEFORE any body parsers
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  // Log webhook request headers for troubleshooting (but exclude sensitive data)
  console.log('Stripe webhook received:', {
    method: req.method,
    path: req.path,
    contentType: req.headers['content-type'],
    signatureExists: !!signature,
    bodySize: req.body ? req.body.length : 0
  });
  
  let event;

  try {
    // Verify webhook signature using the Stripe webhook secret
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log(`✓ Webhook signature verified for event type: ${event.type}`);
  } catch (err) {
    console.error(`✗ Webhook signature verification failed:`, err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  try {
    console.log(`Processing webhook event: ${event.type}`, {
      id: event.id,
      created: new Date(event.created * 1000).toISOString()
    });
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('→ Processing checkout.session.completed', {
          id: session.id,
          customer: session.customer,
          subscription: session.subscription,
          metadata: session.metadata
        });
        handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('→ Processing customer.subscription.created', {
          id: subscription.id,
          customer: subscription.customer,
          status: subscription.status
        });
        handleSubscriptionEvent(subscription, 'created');
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('→ Processing customer.subscription.updated', {
          id: subscription.id,
          customer: subscription.customer,
          status: subscription.status
        });
        handleSubscriptionEvent(subscription, 'updated');
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('→ Processing customer.subscription.deleted', {
          id: subscription.id,
          customer: subscription.customer,
          status: subscription.status
        });
        handleSubscriptionEvent(subscription, 'deleted');
        break;
      }

      default:
        console.log(`⚠ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`✗ Error processing webhook:`, error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

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
  origin: ["http://localhost:3000", "https://app.cryptique.io", "https://cryptique.io", "https://www.cryptique.io", "https://cashtrek.org"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
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

// Global middleware to handle CORS headers more explicitly
app.use((req, res, next) => {
  // Set common security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  
  const origin = req.headers.origin;
  
  // For SDK routes, use more permissive CORS settings
  if (req.path.startsWith('/api/sdk/')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cryptique-site-id, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    // Handle preflight OPTIONS requests for SDK routes immediately
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  } 
  // For analytics routes, also be permissive
  else if (req.path.startsWith('/api/analytics/')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  // For all other routes, use more restrictive CORS
  else if (origin && (
    origin.includes('app.cryptique.io') || 
    origin.includes('cryptique.io') || 
    origin.includes('localhost') ||
    origin.includes('cashtrek.org')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
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

// Add the checkout session completed handler function
async function handleCheckoutSessionCompleted(session) {
  try {
    // Get metadata from the checkout session
    // Try to get metadata from both possible locations
    let teamId = session.metadata?.teamId;
    let planType = session.metadata?.planType;
    let billingCycle = session.metadata?.billingCycle || 'monthly';
    
    // If metadata not found at session level, try to get it from subscription data
    // This handles legacy sessions and ensures both formats work
    if (!teamId || !planType) {
      console.log('Session-level metadata missing, checking subscription_data.metadata');
      
      // Also check client_reference_id as an alternative source for teamId
      if (!teamId && session.client_reference_id) {
        teamId = session.client_reference_id;
        console.log(`Using client_reference_id as teamId: ${teamId}`);
      }
      
      // If we still don't have what we need and there's a subscription ID
      if ((!teamId || !planType) && session.subscription) {
        try {
          // Fetch the subscription to get metadata from there
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          if (subscription.metadata) {
            teamId = teamId || subscription.metadata.teamId;
            planType = planType || subscription.metadata.planType;
            billingCycle = billingCycle || subscription.metadata.billingCycle || 'monthly';
            console.log('Retrieved metadata from subscription:', { teamId, planType, billingCycle });
          }
        } catch (err) {
          console.error('Error fetching subscription metadata:', err);
        }
      }
    }
    
    console.log('Processing checkout session:', { 
      teamId, 
      planType, 
      subscription: session.subscription,
      customer: session.customer,
      metadataSource: session.metadata?.teamId ? 'session' : 
                     session.client_reference_id ? 'client_reference_id' : 
                     'subscription'
    });

    if (!teamId || !planType) {
      console.log('Missing teamId or planType in all available metadata sources');
      return;
    }

    // Get or create the subscription
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    // Update the team with the subscription details
    await Team.findByIdAndUpdate(teamId, {
      stripeCustomerId: customerId,
      'subscription.stripeSubscriptionId': subscriptionId,
      'subscription.plan': planType.toLowerCase(),
      'subscription.status': 'active',
      'subscription.billingCycle': billingCycle
    });

    console.log(`Team ${teamId} subscription updated successfully with subscription ID ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

// Handle subscription events (created, updated, deleted)
async function handleSubscriptionEvent(subscription, eventType) {
  try {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    
    // Find the team associated with this customer
    const team = await Team.findOne({ stripeCustomerId: customerId });
    
    if (!team) {
      console.error(`No team found for Stripe customer ${customerId}`);
      return;
    }
    
    console.log(`Found team ${team._id} for customer ${customerId}`);
    
    // Handle different event types
    switch (eventType) {
      case 'created':
        // This might be redundant if we already handled checkout.session.completed
        // but it's a good fallback for subscriptions created directly via API
        if (!team.subscription.stripeSubscriptionId) {
          // Only update if we don't already have a subscription ID
          // Determine the plan from the first item in the subscription
          let planType = 'basic'; // Default fallback
          if (subscription.items && subscription.items.data && subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            // Try to determine the plan from price id
            if (priceId.includes('pro')) planType = 'pro';
            else if (priceId.includes('enterprise')) planType = 'enterprise';
            else if (priceId.includes('offchain')) planType = 'offchain';
          }
          
          const billingCycle = subscription.items.data[0].plan.interval === 'year' ? 'annual' : 'monthly';
          
          await Team.findByIdAndUpdate(team._id, {
            'subscription.stripeSubscriptionId': subscriptionId,
            'subscription.plan': planType,
            'subscription.status': subscription.status === 'active' ? 'active' : 'inactive',
            'subscription.billingCycle': billingCycle
          });
          
          console.log(`Created subscription for team ${team._id} with plan ${planType}`);
        }
        break;
        
      case 'updated':
        // Update subscription status
        await Team.findByIdAndUpdate(team._id, {
          'subscription.status': subscription.status === 'active' ? 'active' : 'inactive',
          // Include other fields that might have changed
          'subscription.billingCycle': subscription.items.data[0].plan.interval === 'year' ? 'annual' : 'monthly'
        });
        
        console.log(`Updated subscription status for team ${team._id} to ${subscription.status}`);
        break;
        
      case 'deleted':
        // Mark subscription as cancelled
        await Team.findByIdAndUpdate(team._id, {
          'subscription.status': 'cancelled',
          'subscription.plan': 'free' // Downgrade to free plan
        });
        
        console.log(`Marked subscription as cancelled for team ${team._id}`);
        break;
    }
  } catch (error) {
    console.error(`Error handling subscription ${eventType} event:`, error);
  }
}

// Use routers - using the already imported router variables from above
app.use('/api/auth', authRouter);
app.use('/api/team', teamRouter);
app.use('/api/website', websiteRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/contracts', contractRouter);
app.use('/api/transactions', transactionRouter);
app.use('/api/sdk', sdkRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/events', eventRouter);
app.use('/api/campaign', campaignRouter);
app.use('/api/stripe', stripeRouter);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});