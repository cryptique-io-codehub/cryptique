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
app.get("/", (req, res) => {
  res.send(
    '<h1 style="text-align:center;">Welcome to the Cryptique Server</h1>'
  );
});

// Debug endpoint to check environment variables
app.get("/debug/env", (req, res) => {
  res.json({
    hasGeminiApi: !!process.env.GEMINI_API,
    nodeEnv: process.env.NODE_ENV,
    envCount: Object.keys(process.env).length
  });
});

app.use("/api/auth", userRouter);
app.use("/api/team", require("./routes/teamRouter"));
app.use("/api/sdk", require("./routes/sdkRouter"));
app.use("/api/website",require("./routes/websiteRouter"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/ai", require("./routes/aiRouter"));

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});