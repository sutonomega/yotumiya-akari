const fs = require("fs");
const path = require("path");

const { appendMemoryText } = require("./stateStore");

const DEFAULT_CONFIG = Object.freeze({
  aiLinePrefixPattern: "^AI:\\s*",
  shortMaxLength: 80,
  questionPattern: "[？?]$",
  styleSignals: {},
  rules: {},
});

let cachedConfig = null;

function readPersonalityRulesConfig() {
  const filePath = path.join(process.cwd(), "config", "personality_rules.json");

  if (!fs.existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }

  return {
    ...DEFAULT_CONFIG,
    ...JSON.parse(fs.readFileSync(filePath, "utf-8")),
  };
}

function loadPersonalityRulesConfig() {
  if (!cachedConfig) {
    cachedConfig = readPersonalityRulesConfig();
  }

  return cachedConfig;
}

function reloadPersonalityRulesConfig() {
  cachedConfig = readPersonalityRulesConfig();
  return cachedConfig;
}

function readFeedback(settings, fileName) {
  const filePath = path.join(process.cwd(), settings.memoryDir, "feedback", fileName);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function extractStyleSignals(text, config = loadPersonalityRulesConfig()) {
  const aiLinePrefix = new RegExp(config.aiLinePrefixPattern);
  const questionPattern = new RegExp(config.questionPattern);
  const gentlePattern = config.styleSignals?.gentle
    ? new RegExp(config.styleSignals.gentle)
    : null;
  const technicalPattern = config.styleSignals?.technical
    ? new RegExp(config.styleSignals.technical)
    : null;
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => aiLinePrefix.test(line))
    .map((line) => line.replace(aiLinePrefix, ""));

  const signals = {
    short: 0,
    question: 0,
    gentle: 0,
    technical: 0,
  };

  for (const line of lines) {
    if (line.length <= config.shortMaxLength) signals.short += 1;
    if (questionPattern.test(line)) signals.question += 1;
    if (gentlePattern?.test(line)) signals.gentle += 1;
    if (technicalPattern?.test(line)) signals.technical += 1;
  }

  return signals;
}

function buildRules(goodSignals, badSignals, config = loadPersonalityRulesConfig()) {
  const rules = [];

  if (goodSignals.short >= badSignals.short && config.rules.short) {
    rules.push(config.rules.short);
  }

  if (goodSignals.gentle > 0 && config.rules.gentle) {
    rules.push(config.rules.gentle);
  }

  if (goodSignals.technical > 0 && config.rules.technical) {
    rules.push(config.rules.technical);
  }

  if (badSignals.question > goodSignals.question && config.rules.question) {
    rules.push(config.rules.question);
  }

  return rules.length > 0 ? rules : [config.rules.default].filter(Boolean);
}

function distillPersonalityRules(settings) {
  const config = loadPersonalityRulesConfig();
  const good = readFeedback(settings, "good_examples.txt");
  const bad = readFeedback(settings, "bad_examples.txt");
  const goodSignals = extractStyleSignals(good, config);
  const badSignals = extractStyleSignals(bad, config);

  return buildRules(goodSignals, badSignals, config);
}

function savePersonalityRules(settings) {
  const rules = distillPersonalityRules(settings);
  const text = "\n# distilled rules " + new Date().toISOString() + "\n" + rules.join("\n") + "\n";
  appendMemoryText("conversation_rules.txt", text, settings);
  return rules;
}

module.exports = {
  distillPersonalityRules,
  loadPersonalityRulesConfig,
  reloadPersonalityRulesConfig,
  savePersonalityRules,
};
