const express = require("express");
const cors = require("cors");
const app = express();
const dotenv = require("dotenv");
dotenv.config()
const PORT = process.env.PORT || 4000;
const mongoose = require("mongoose");

app.use(express.json());

// Enable CORS
app.use(cors());

mongoose.connect("mongodb+srv://support:HwpiKQmzfFqDsjtW@cluster0.pkuw6ma.mongodb.net/?retryWrites=true&w=majority");

mongoose.connection.on('connected', () => {
  console.log("Connected to MongoDB");
});

mongoose.connection.on('error', () => {
  console.log("Not Connected to MongoDB");
});

app.use(require('./Stock/main.js'));
app.use(require('./Stock/user.js'));

app.get("/", (req, res) => {
  res.send("Homecrop is running on 5000");
});

app.listen(PORT, () => {
  console.log("Server is running on", PORT);
});

module.exports = app;