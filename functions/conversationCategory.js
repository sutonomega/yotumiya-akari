const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = Object.freeze({
  categories: ["casual"],
  signals: {},
  instructions: { default: "" },
  sleepyHourStart: 0,
  sleepyHourEnd: 6,
});

let cachedConfig = null;

function readConversationCategoryConfig() {
  const filePath = path.join(process.cwd(), "config", "conversation_category.json");

  if (!fs.existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }

  return {
    ...DEFAULT_CONFIG,
    ...JSON.parse(fs.readFileSync(filePath, "utf-8")),
  };
}

function loadConversationCategoryConfig() {
  if (!cachedConfig) {
    cachedConfig = readConversationCategoryConfig();
  }

  return cachedConfig;
}

function reloadConversationCategoryConfig() {
  cachedConfig = readConversationCategoryConfig();
  return cachedConfig;
}

function scoreCategory(text, category, config = loadConversationCategoryConfig()) {
  const signals = config.signals?.[category] || [];

  return signals.reduce((score, pattern) => {
    return new RegExp(pattern, "i").test(text) ? score + 1 : score;
  }, 0);
}

function classifyConversation(message, currentState = {}) {
  const config = loadConversationCategoryConfig();
  const text = String(message || "");
  const categories = config.categories || DEFAULT_CONFIG.categories;
  const scores = Object.fromEntries(
    categories.map((category) => [
      category,
      scoreCategory(text, category, config),
    ]),
  );

  if (
    currentState.hour >= config.sleepyHourStart &&
    currentState.hour < config.sleepyHourEnd &&
    scores.sleepy !== undefined
  ) {
    scores.sleepy += 1;
  }

  if (scores.playful === 1 && scores.technical > 0) {
    scores.playful -= 1;
  }

  const [bestCategory, bestScore] = Object.entries(scores).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return bestScore > 0 ? bestCategory : "casual";
}

function categoryInstruction(category) {
  const config = loadConversationCategoryConfig();
  return config.instructions?.[category] || config.instructions?.default || "";
}

module.exports = {
  categoryInstruction,
  classifyConversation,
  loadConversationCategoryConfig,
  reloadConversationCategoryConfig,
  scoreCategory,
};
