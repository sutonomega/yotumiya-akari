const fs = require("fs");
const path = require("path");

const {
  categoryInstruction,
  classifyConversation,
} = require("./conversationCategory");
const { retrieveMemory } = require("./memoryRetrieval");

function loadPrompt(fileName, options = {}) {
  const filePath = path.join(options.baseDir || process.cwd(), "prompts", fileName);
  const existsSync = options.existsSync || fs.existsSync;
  const readFileSync = options.readFileSync || fs.readFileSync;

  if (!existsSync(filePath)) {
    return "";
  }

  return readFileSync(filePath, "utf-8");
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => {
    return text.replaceAll(`{{${key}}}`, String(value));
  }, template);
}

function sanitizeModelText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```(?:\w+)?/g, "").replace(/```/g, ""),
    )
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !/^(analysis|conversation category|mode|relevant memories|draft|final)\s*[:：]/i.test(
        trimmed,
      );
    })
    .join("\n")
    .trim();
}

async function analyzeInput({ settings, userMessage, currentState }) {
  // ========================================
  // disabled
  // ========================================

  if (!settings.enableAnalyzeInput) {
    return {
      category: "casual",
      categoryInstruction: "",
      memories: [],
      timeText: currentState.timeText,
    };
  }

  const category = classifyConversation(userMessage, currentState);
  const memories = retrieveMemory(
    settings,
    {
      text: userMessage,
      category,
    },
    { limit: 6 },
  );

  return {
    category,
    categoryInstruction: categoryInstruction(category),
    memories,
    timeText: currentState.timeText,
  };
}

async function buildBaseReply({
  callModel,
  messages,
  analysis,
  mode,
  settings,
  promptLoader = loadPrompt,
}) {
  // ========================================
  // disabled
  // ========================================

  if (!settings.enableBaseReply) {
    return "";
  }

  const analysisText = [
    `conversation category: ${analysis.category}`,
    `instruction: ${analysis.categoryInstruction}`,
    `mode: ${mode}`,
    analysis.memories.length > 0
      ? `relevant memories:\n${analysis.memories.map((item) => item.raw).join("\n")}`
      : "relevant memories: none",
  ].join("\n");

  const requestMessages = [
    ...messages,
    {
      role: "system",
      content: renderTemplate(promptLoader("response_base_rules.txt"), {
        analysisText,
      }),
    },
  ];

  // debug
  // console.log("[FINAL REQUEST]", JSON.stringify(requestMessages, null, 2));

  return sanitizeModelText(await callModel(requestMessages));
}

async function personalizeReply({
  callModel,
  baseReply,
  settings,
  mode,
  promptLoader = loadPrompt,
}) {
  // ========================================
  // disabled
  // ========================================

  if (!settings.enablePersonalizeReply) {
    return sanitizeModelText(baseReply);
  }

  return sanitizeModelText(await callModel([
    {
      role: "system",
      content: promptLoader("response_personalize.txt"),
    },
    {
      role: "user",
      content: `mode: ${mode}\nDraft:\n${baseReply}`,
    },
  ]));
}

async function runResponsePipeline({
  settings,
  userMessage,
  currentState,
  messages,
  mode,
  callModel,
  promptLoader = loadPrompt,
}) {
  const analysis = await analyzeInput({
    settings,
    userMessage,
    currentState,
  });

  const baseReply = await buildBaseReply({
    callModel,
    messages,
    analysis,
    mode,
    settings,
    promptLoader,
  });

  const finalReply = await personalizeReply({
    callModel,
    baseReply,
    settings,
    mode,
    promptLoader,
  });

  return {
    analysis,
    baseReply,
    finalReply,
  };
}

module.exports = {
  analyzeInput,
  loadPrompt,
  buildBaseReply,
  personalizeReply,
  runResponsePipeline,
};
