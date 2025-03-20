const express = require("express");
const { connect } = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const app = express();
const PORT = process.env.PORT || 3001;
connect(process.env.MONGODB_URI).then(() => {
  console.log("Connected to the database");
});

const allowedOrigins = ["https://cryptique.vercel.app", "http://localhost:3000"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.send(
    '<h1 style="text-align:center;">Welcome to the Cryptique Server</h1>'
  );
});
app.use("/api/auth", require("./routes/userRouter"));
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
