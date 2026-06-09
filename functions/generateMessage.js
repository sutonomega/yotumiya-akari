const fs = require("fs");
const path = require("path");

const { getEnvironmentState } = require("./environmentState");
const { createLlmProvider } = require("./llmProvider");
const loadSettings = require("./loadSettings");
const parseHistory = require("./parseHistory");
const { saveRecentPhrases, suppressRecentPhrases } = require("./recentPhrases");
const { runResponsePipeline } = require("./responsePipeline");
const { composeStatePrompt } = require("./statePrompt");
const { formatTimeText } = require("./timeFormatter");
const { repairTimeSignalPost } = require("./timeSignalSafety");
function isPostMode(settings) {
  return settings.generationMode === "post";
}

function isReplyMode(settings) {
  return settings.generationMode === "reply";
}

function loadText(...paths) {
  const filePath = path.join(process.cwd(), ...paths);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function parsePromptMap(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((items, line) => {
      const index = line.indexOf("=");

      if (index === -1) {
        return items;
      }

      return {
        ...items,
        [line.slice(0, index).trim()]: line.slice(index + 1).trim(),
      };
    }, {});
}

function getTimeDescription(currentState) {
  const hour = currentState.hour;
  const prompts = parsePromptMap(loadText("prompts", "time_description.txt"));

  if (hour === 6) {
    return prompts.hour_6 || "";
  }

  if (hour === 0) {
    return prompts.hour_0 || "";
  }

  if (hour >= 7 && hour <= 23) {
    return (prompts.hour_7_23 || "").replaceAll("{hour}", String(hour));
  }

  return prompts.default || "";
}

function buildSystemPrompt(settings, currentState) {
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
  const systemPrompt = loadText("prompts", "system.txt");
  const webChatPrompt = settings.enableWebChatPrompt ? loadText("prompts", "web_chat.txt") : "";

  return [
    systemPrompt,
    webChatPrompt,
    settings.enableAiProfile ? `${settings.aiName} profile:\n${aiProfile}` : "",
    settings.enableUserProfile
      ? `${settings.userName} profile:\n${userProfile}`
      : "",
    settings.enableCurrentState
      ? `current state:\n${composeStatePrompt(currentState, settings)}`
      : "",
    settings.enableCalendarPrompt && currentState.calendar?.prompt
      ? `calendar:\n${currentState.calendar.prompt}`
      : "",
    settings.enableLongMemory ? `long memory:\n${longMemory}` : "",
    settings.enableGoodExamples ? `good examples:\n${goodExamples}` : "",
    settings.enableBadExamples ? `bad examples:\n${badExamples}` : "",
    settings.enableConversationRules ? conversationRules : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildMessages({
  settings,
  state,
  recentHistory = "",
  userMessage = "",
  eventPrompt = "",
}) {
  const messages = [
    {
      role: "system",
      content: buildSystemPrompt(settings, state),
    },
  ];

  if (settings.enableRecentChatHistory !== false) {
    messages.push(...parseHistory(settings, recentHistory));
  }

  if (isReplyMode(settings)) {
    messages.push({
      role: "user",
      content: userMessage,
    });
    return messages;
  }

  const timeSignalPrompt = loadText("prompts", "time_signal.txt");
  messages.push({
    role: "user",
    content: `${eventPrompt || getTimeDescription(state)}\n\n${state.calendar.prompt}\n\n${timeSignalPrompt}`,
  });

  return messages;
}

async function generateMessage({
  mode = null,
  userMessage = "",
  currentHour = null,
  currentState = null,
  eventPrompt = "",
  settingsOverride = null,
} = {}) {
  const baseSettings = settingsOverride || loadSettings();
  const settings = {
    ...baseSettings,
    generationMode: baseSettings.generationMode || mode || "reply",
  };
  const state =
    currentState ||
    (await getEnvironmentState({
      settings,
      now:
        currentHour === null
          ? undefined
          : new Date(new Date().setHours(currentHour)),
      userMessage,
    }));

  try {
    const llm = createLlmProvider(settings);
    const chatHistory = loadText(settings.memoryDir, "chat_history.txt");
    const recentHistory = chatHistory
      .trim()
      .split("\n")
      .slice(-settings.recentChatLines)
      .join("\n");

    const messages = buildMessages({
      settings,
      state,
      recentHistory,
      userMessage,
      eventPrompt,
    });

    const pipeline = await runResponsePipeline({
      settings,
      userMessage:
        isReplyMode(settings)
          ? userMessage
          : eventPrompt || getTimeDescription(state),
      currentState: state,
      messages,
      mode: settings.generationMode,
      callModel: (nextMessages) => llm.chat(nextMessages),
    });
    console.log("[BEFORE SUPPRESS]", pipeline.finalReply);
    let message = suppressRecentPhrases(settings, pipeline.finalReply);
    console.log("[AFTER SUPPRESS]", message);
    if (isPostMode(settings)) {
      const repairPrompt = loadText("prompts", "time_signal_repair.txt");
      const repair = await repairTimeSignalPost({
        settings,
        currentState: state,
        message,
        regenerate: ({ previousText, reasons }) =>
          llm.chat([
            {
              role: "system",
              content: repairPrompt,
            },
            {
              role: "user",
              content:
                `timeText: ${state.timeText}\nhour: ${state.hour}\nreasons: ${reasons.join(", ")}\nDraft:\n${previousText}`,
            },
          ]),
      });

      if (repair.fallbackUsed) {
        console.log("[TIME SIGNAL FALLBACK]", repair.reasons.join(", "));
      }

      message = repair.message;
    }

    if (isPostMode(settings)) {
      message = `${formatTimeText(state.hour)}\n${message}`;
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
module.exports.buildMessages = buildMessages;
module.exports.buildSystemPrompt = buildSystemPrompt;
