const fs = require("fs");

const path = require("path");

const loadSettings = require("./loadSettings");

const parseHistory = require("./parseHistory");

// =========================
// settings
// =========================

const settings = loadSettings();

// =========================
// text loader
// =========================

function loadText(...paths) {
  return fs.readFileSync(
    path.join(process.cwd(), ...paths),

    "utf-8",
  );
}

// =========================
// generateMessage
// =========================

async function generateMessage({
  mode = "reply",

  userMessage = "",

  currentHour = null,
}) {
  try {
    // =========================
    // memory
    // =========================

    const goodExamples = loadText(
      settings.memoryDir,
      "feedback",
      "good_examples.txt",
    );

    const badExamples = loadText(
      settings.memoryDir,
      "feedback",
      "bad_examples.txt",
    );

    const aiProfile = loadText(settings.memoryDir, "ai_profile.txt");

    const userProfile = loadText(settings.memoryDir, "user_profile.txt");

    const conversationRules = loadText(
      settings.memoryDir,
      "conversation_rules.txt",
    );

    const longMemory = loadText(settings.memoryDir, "long_memory.txt");

    const chatHistory = loadText(settings.memoryDir, "chat_history.txt");

    // =========================
    // prompts
    // =========================

    const systemPrompt = loadText("prompts", "system.txt");

    const timeSignalPrompt = loadText("prompts", "time_signal.txt");

    // =========================
    // recent history
    // =========================

    const recentHistory = chatHistory
      .trim()
      .split("\n")
      .slice(-settings.recentChatLines)
      .join("\n");

    // =========================
    // history parse
    // =========================

    const historyMessages = parseHistory(settings, recentHistory);

    // =========================
    // system
    // =========================

    const finalSystemPrompt = `
${systemPrompt}

【${settings.aiName}プロフィール】
${aiProfile}

【${settings.userName}プロフィール】
${userProfile}

【長期記憶】
${longMemory}

【良い返答例】
${goodExamples}

【悪い返答例】
${badExamples}

${conversationRules}
`;

    // =========================
    // messages
    // =========================

    const messages = [
      {
        role: "system",

        content: finalSystemPrompt,
      },

      ...historyMessages,
    ];

    // =========================
    // time text
    // =========================

    let timeText = "";

    if (mode === "post") {
      const period = currentHour < 12 ? "午前" : "午後";

      const displayHour = currentHour % 12 || 12;

      timeText = `${period}${displayHour}時です。`;
    }

    // =========================
    // reply
    // =========================

    if (mode === "reply") {
      messages.push({
        role: "user",

        content: userMessage,
      });
    }

    // =========================
    // time signal
    // =========================
    else if (mode === "post") {
      messages.push({
        role: "user",

        content: timeSignalPrompt,
      });
    }

    // =========================
    // ollama
    // =========================

    const response = await fetch(
      "http://localhost:11434/api/chat",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: settings.chatModel,

          messages,

          stream: false,

          options: {
            temperature: settings.temperature,
          },
        }),
      },
    );

    const data = await response.json();

    let message = data.message.content.trim();

    // =========================
    // think remove
    // =========================

    message = message.replace(/<think>[\s\S]*?<\/think>/g, "");

    message = message.trim();

    // =========================
    // add time text
    // =========================

    if (mode === "post") {
      message = `${timeText}\n${message}`;
    }

    // =========================
    // max length
    // =========================

    if (message.length > settings.replyMaxLength) {
      message = message.slice(0, settings.replyMaxLength);
    }

    return message;
  } catch (error) {
    console.log("[GENERATE ERROR]", error);

    return settings.defaultMessage;
  }
}

module.exports = generateMessage;
