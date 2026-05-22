const express = require("express");

const cors = require("cors");

const chat = require("./chat");

const app = express();

app.use(cors());

app.use(express.json());

// =========================
// root
// =========================

app.get("/", (req, res) => {
  res.send("API OK");
});

// =========================
// chat api
// =========================

app.post(
  "/api/chat",

  async (req, res) => {
    try {
      const { message } = req.body;

      console.log("CHAT API HIT");

      console.log("USER:", message);

      const reply = await chat({
        mode: "reply",

        userMessage: message,
      });

      res.json({
        reply,
      });
    } catch (error) {
      console.log("API ERROR", error);

      res.status(500).json({
        reply: "エラーが発生しました。",
      });
    }
  },
);

// =========================
// server start
// =========================

app.listen(
  3000,
  "0.0.0.0",

  () => {
    console.log("API SERVER START");
  },
);
