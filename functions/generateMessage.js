const fs = require("fs");
const path = require("path");

const getCurrentState = require("./getCurrentState");
const loadSettings = require("./loadSettings");
const parseHistory = require("./parseHistory");
const { saveRecentPhrases, suppressRecentPhrases } = require("./recentPhrases");
const { runResponsePipeline } = require("./responsePipeline");

function loadText(...paths) {
  const filePath = path.join(process.cwd(), ...paths);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function getTimeDescription(currentState) {
  const hour = currentState.hour;

  if (hour === 6) {
    return "6時。おはようの生活感を少し入れて、朝の空気で返す。";
  }

  if (hour === 0) {
    return "0時。おやすみ前の静けさを大切にして返す。";
  }

  if (hour >= 7 && hour <= 23) {
    return `${hour}時の時報。今の時間帯に合う短い一言にする。`;
  }

  return "深夜帯。投稿は控えめにし、必要な場合だけ短く返す。";
}

function buildSystemPrompt(settings, currentState) {
  const goodExamples = loadText(settings.memoryDir, "feedback", "good_examples.txt");
  const badExamples = loadText(settings.memoryDir, "feedback", "bad_examples.txt");
  const aiProfile = loadText(settings.memoryDir, "ai_profile.txt");
  const userProfile = loadText(settings.memoryDir, "user_profile.txt");
  const conversationRules = loadText(settings.memoryDir, "conversation_rules.txt");
  const longMemory = loadText(settings.memoryDir, "long_memory.txt");
  const systemPrompt = loadText("prompts", "system.txt");

  return [
    systemPrompt,
    `${settings.aiName} profile:\n${aiProfile}`,
    `${settings.userName} profile:\n${userProfile}`,
    `current state:\n${JSON.stringify(currentState, null, 2)}`,
    `long memory:\n${longMemory}`,
    `good examples:\n${goodExamples}`,
    `bad examples:\n${badExamples}`,
    conversationRules,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeMessage(message) {
  return String(message || "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();
}

async function callOllama(settings, messages) {
  const response = await fetch("http://localhost:11434/api/chat", {
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
  });

  const data = await response.json();
  const content = data?.message?.content;

  if (!content) {
    throw new Error("Ollama response invalid");
  }

  return sanitizeMessage(content);
}

async function generateMessage({
  mode = "reply",
  userMessage = "",
  currentHour = null,
  currentState = null,
} = {}) {
  const settings = loadSettings();
  const state =
    currentState ||
    getCurrentState({
      settings,
      now: currentHour === null ? undefined : new Date(new Date().setHours(currentHour)),
    });

  try {
    const chatHistory = loadText(settings.memoryDir, "chat_history.txt");
    const recentHistory = chatHistory
      .trim()
      .split("\n")
      .slice(-settings.recentChatLines)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: buildSystemPrompt(settings, state),
      },
      ...parseHistory(settings, recentHistory),
    ];

    if (mode === "reply") {
      messages.push({
        role: "user",
        content: userMessage,
      });
    } else {
      const timeSignalPrompt = loadText("prompts", "time_signal.txt");
      messages.push({
        role: "user",
        content: `${getTimeDescription(state)}\n\n${timeSignalPrompt}`,
      });
    }

    const pipeline = await runResponsePipeline({
      settings,
      userMessage: mode === "reply" ? userMessage : getTimeDescription(state),
      currentState: state,
      messages,
      mode,
      callModel: (nextMessages) => callOllama(settings, nextMessages),
    });

    let message = suppressRecentPhrases(settings, sanitizeMessage(pipeline.finalReply));

    if (mode === "post") {
      message = `${state.hour}:00\n${message}`;
    }

    if (message.length > settings.replyMaxLength) {
      message = message.slice(0, settings.replyMaxLength);
    }

    saveRecentPhrases(settings, message);

    return message;
  } catch (error) {
    console.log("[GENERATE ERROR]", error);
    return settings.defaultMessage;
  }
}

module.exports = generateMessage;
