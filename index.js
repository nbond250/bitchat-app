const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const messages = [];

app.use(cors());
app.use(bodyParser.json());

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// API to receive a message
app.post("/send", (req, res) => {
  messages.push(req.body);
  res.status(200).send({ status: "Message received" });
});

// API to retrieve messages
app.get("/messages", (req, res) => {
  res.send(messages);
});

// Serve index.html when the user visits the root path
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ BitChat Relay Server is Running on port ${PORT}`);
});
