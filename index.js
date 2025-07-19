const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const messages = [];

app.use(cors());
app.use(bodyParser.json());

app.post("/send", (req, res) => {
  // Basic validation can be added here
  messages.push(req.body);
  res.status(200).send({ status: "Message received" });
});

app.get("/messages", (req, res) => {
  res.send(messages);
});

app.get("/", (req, res) => {
  res.send("✅ BitChat Relay Server is Running");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
});
