const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const messages = [];

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// API endpoint to receive a message
app.post("/send", (req, res) => {
  if (!req.body || !req.body.message || !req.body.address) {
    return res.status(400).send({ status: "Invalid message format" });
  }
  messages.push(req.body);
  res.status(200).send({ status: "Message received" });
});

// API endpoint to retrieve all messages
app.get("/messages", (req, res) => {
  res.status(200).json(messages);
});

// Serve the main frontend interface
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server on the specified port (Render uses PORT env)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ BitChat Relay Server is Running on port ${PORT}`);
});
