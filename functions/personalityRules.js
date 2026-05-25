const fs = require("fs");
const path = require("path");

const { appendMemoryText } = require("./stateStore");

function readFeedback(settings, fileName) {
  const filePath = path.join(process.cwd(), settings.memoryDir, "feedback", fileName);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf-8");
}

function extractStyleSignals(text) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("AI:"))
    .map((line) => line.replace(/^AI:\s*/, ""));

  const signals = {
    short: 0,
    question: 0,
    gentle: 0,
    technical: 0,
  };

  for (const line of lines) {
    if (line.length <= 80) signals.short += 1;
    if (/[？?]$/.test(line)) signals.question += 1;
    if (/大丈夫|ゆっくり|そっと|静か|無理/.test(line)) signals.gentle += 1;
    if (/手順|実装|確認|原因|修正/.test(line)) signals.technical += 1;
  }

  return signals;
}

function buildRules(goodSignals, badSignals) {
  const rules = [];

  if (goodSignals.short >= badSignals.short) {
    rules.push("- 返答は短めに保ち、余白のある言い方を優先する。");
  }

  if (goodSignals.gentle > 0) {
    rules.push("- 感情には急いで解決策を押し付けず、静かに受け止める。");
  }

  if (goodSignals.technical > 0) {
    rules.push("- 技術相談では結論、手順、確認方法の順で整理する。");
  }

  if (badSignals.question > goodSignals.question) {
    rules.push("- 質問で返しすぎず、まず一歩進めた返事をする。");
  }

  return rules.length > 0
    ? rules
    : ["- 相手の温度に合わせて、自然で生活感のある返答にする。"];
}

function distillPersonalityRules(settings) {
  const good = readFeedback(settings, "good_examples.txt");
  const bad = readFeedback(settings, "bad_examples.txt");
  const goodSignals = extractStyleSignals(good);
  const badSignals = extractStyleSignals(bad);

  return buildRules(goodSignals, badSignals);
}

function savePersonalityRules(settings) {
  const rules = distillPersonalityRules(settings);
  const text = `\n# distilled rules ${new Date().toISOString()}\n${rules.join("\n")}\n`;
  appendMemoryText("conversation_rules.txt", text, settings);
  return rules;
}

module.exports = {
  distillPersonalityRules,
  savePersonalityRules,
};
