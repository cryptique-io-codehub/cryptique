const express = require("express");
const { connect } = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const userRouter = require("./routes/userRouter");
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

app.use(cors({
  origin: ["http://localhost:3000", "https://app.cryptique.io"],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(bodyParser.json());

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

// Load routes
console.log('Loading routes...');

app.use("/api/auth", userRouter);
app.use("/api/team", require("./routes/teamRouter"));
app.use("/api/sdk", require("./routes/sdkRouter"));
app.use("/api/website", require("./routes/websiteRouter"));
app.use("/api/analytics", require("./routes/analytics"));

// Load AI router with explicit error handling
try {
  const aiRouter = require("./routes/aiRouter");
  app.use("/", aiRouter);
  console.log('AI router loaded successfully');
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