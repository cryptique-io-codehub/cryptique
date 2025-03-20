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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// Handle preflight requests
app.options("*", cors()); 
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
