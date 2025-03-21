const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const userRouter = require("./routes/userRouter");

const app = express();
const PORT = process.env.PORT || 3001;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to the database"))
  .catch((error) => {
    console.error("Failed to connect to the database:", error);
    process.exit(1);
  });

// CORS configuration
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL || "https://cryptique.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send('<h1 style="text-align:center;">Welcome to the Cryptique Server</h1>');
});

app.use("/api/auth", userRouter);

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await mongoose.connection.close();
  server.close(() => {
    console.log("Server closed.");
    process.exit(0);
  });
});
