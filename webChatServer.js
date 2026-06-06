const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const generateMessage = require("./functions/generateMessage");
const processHistory = require("./functions/processHistory");
const { getEnvironmentState } = require("./functions/environmentState");
const loadSettings = require("./functions/loadSettings");
const utteranceQueue = require("./functions/utteranceQueue");

function buildWebChatSettings(settings) {
  return {
    ...settings,
    enableAnalyzeInput:
      settings.enableWebChatAnalyzeInput ?? settings.enableAnalyzeInput,
    enableCurrentState:
      settings.enableWebChatCurrentState ?? settings.enableCurrentState,
  };
}

function createWebChatApp({
  settings = loadSettings(),
  generate = generateMessage,
  getState = getEnvironmentState,
  processChatHistory = processHistory,
  queue = utteranceQueue,
} = {}) {
  const app = express();
  const webChatSettings = buildWebChatSettings(settings);

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  app.get("/", (req, res) => {
    res.send("WEB CHAT OK");
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;

      console.log("WEB CHAT API HIT");
      console.log("USER:", message);

      const currentState = await getState({
        settings: webChatSettings,
        userMessage: message,
      });

      const reply = await queue.enqueue("web-chat:reply", () =>
        generate({
          mode: "reply",
          userMessage: message,
          currentState,
          settingsOverride: webChatSettings,
        }),
      );

      await processChatHistory({
        settings: webChatSettings,
        mode: "reply",
        userMessage: message,
        aiMessage: reply,
      });

      res.json({ reply });
    } catch (error) {
      console.log("[WEB CHAT ERROR]", error);
      res.status(500).json({ reply: "エラーが発生しました。" });
    }
  });

  app.post("/api/feedback", (req, res) => {
    try {
      const { type, user, reply } = req.body;
      const saveText = `USER: ${user}\nAI: ${reply}\n\n`;
      const fileName = type === "good" ? "good_examples.txt" : "bad_examples.txt";

      fs.appendFileSync(
        path.join(
          process.cwd(),
          webChatSettings.memoryDir,
          "feedback",
          fileName,
        ),
        saveText,
        "utf-8",
      );

      console.log("[WEB CHAT FEEDBACK]", type);
      res.json({ success: true });
    } catch (error) {
      console.log("[WEB CHAT FEEDBACK ERROR]", error);
      res.status(500).json({ success: false });
    }
  });

  return app;
}

function startWebChatServer({
  settings = loadSettings(),
  port = settings.webChatPort || 3000,
} = {}) {
  const app = createWebChatApp({ settings });

  return app.listen(port, () => {
    console.log("WEB CHAT SERVER START");
    console.log(`Web Chat Server: http://127.0.0.1:${port}`);
    console.log(`Web UI: http://127.0.0.1:${settings.webChatFrontendPort || 5173}`);
  });
}

if (require.main === module) {
  startWebChatServer();
}

module.exports = {
  buildWebChatSettings,
  createWebChatApp,
  startWebChatServer,
};
