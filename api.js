const express = require("express");

const cors = require("cors");

const fs = require("fs");

const path = require("path");

const chat = require("./chat");

const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "settings.json"), "utf-8"),
);

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.static(path.join(process.cwd(), "public")));

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
        settings,

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
// feedback api
// =========================

app.post(
  "/api/feedback",

  (req, res) => {
    try {
      const {
        type,

        user,

        reply,
      } = req.body;

      const saveText = `USER: ${user}\n` + `AI: ${reply}\n\n`;

      // good
      if (type === "good") {
        fs.appendFileSync(
          path.join(
            process.cwd(),
            settings.memoryDir,
            "feedback",
            "good_examples.txt",
          ),

          saveText,

          "utf-8",
        );
      }

      // bad
      else {
        fs.appendFileSync(
          path.join(
            process.cwd(),
            settings.memoryDir,
            "feedback",
            "bad_examples.txt",
          ),

          saveText,

          "utf-8",
        );
      }

      console.log("[FEEDBACK]", type);

      res.json({
        success: true,
      });
    } catch (error) {
      console.log("[FEEDBACK ERROR]", error);

      res.status(500).json({
        success: false,
      });
    }
  },
);

// =========================
// server start
// =========================

app.listen(3000, () => {
  console.log("API SERVER START");
});
