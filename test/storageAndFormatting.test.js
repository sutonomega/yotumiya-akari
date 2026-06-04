const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const loadJson = require("../functions/loadJson");
const {
  appendMemoryText,
  memoryPath,
  readState,
  updateState,
  writeState,
} = require("../functions/stateStore");
const { formatTimeText } = require("../functions/timeFormatter");
const { composeStatePrompt } = require("../functions/statePrompt");

function tempSettings(t) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "state-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { memoryDir: path.relative(process.cwd(), dir) };
}

test("formatTimeText formats midnight, morning, noon, and afternoon", () => {
  assert.equal(formatTimeText(0), "午前0時");
  assert.equal(formatTimeText(9), "午前9時");
  assert.equal(formatTimeText(12), "午後12時");
  assert.equal(formatTimeText(21), "午後9時");
});

test("loadJson returns default for missing and invalid files", () => {
  assert.deepEqual(loadJson("/tmp/no-such-yorumiya-file.json", { ok: true }), { ok: true });

  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "load-json-"));
  const invalidPath = path.join(dir, "invalid.json");
  fs.writeFileSync(invalidPath, "{invalid", "utf-8");
  assert.deepEqual(loadJson(invalidPath, { fallback: true }), { fallback: true });
  fs.rmSync(dir, { recursive: true, force: true });
});

test("stateStore reads, writes, updates, and appends memory files", (t) => {
  const settings = tempSettings(t);

  assert.equal(memoryPath("state.json", settings), path.join(process.cwd(), settings.memoryDir, "state.json"));
  assert.deepEqual(readState("state.json", { count: 0 }, settings), { count: 0 });
  assert.deepEqual(writeState("state.json", { count: 1 }, settings), { count: 1 });
  assert.deepEqual(readState("state.json", {}, settings), { count: 1 });
  assert.deepEqual(updateState("state.json", {}, (state) => ({ count: state.count + 1 }), settings), { count: 2 });

  appendMemoryText("notes.txt", "hello", settings);
  appendMemoryText("notes.txt", " world", settings);
  assert.equal(fs.readFileSync(path.join(process.cwd(), settings.memoryDir, "notes.txt"), "utf-8"), "hello world");
});


test("composeStatePrompt adds weather grounding when weather is unknown", () => {
  const prompt = composeStatePrompt(
    {
      hour: 9,
      timeText: "morning",
      weather: { summary: "unknown" },
      moodData: { mood: "normal" },
      conversation: { category: "casual" },
      calendar: { currentEvents: [], recentlyEndedEvents: [], upcomingEvents: [] },
    },
    { calendarPrivateKeywords: [] },
  );

  assert.ok(prompt.includes("天気: 不明"));
  assert.ok(prompt.includes("天候情報が不明"));
  assert.ok(prompt.includes("天候を断定しない"));
});

test("composeStatePrompt omits weather grounding when weather is known", () => {
  const prompt = composeStatePrompt(
    {
      hour: 9,
      timeText: "morning",
      weather: { summary: "晴れ", temperature: 20 },
      moodData: { mood: "normal" },
      conversation: { category: "casual" },
      calendar: { currentEvents: [], recentlyEndedEvents: [], upcomingEvents: [] },
    },
    { calendarPrivateKeywords: [] },
  );

  assert.ok(prompt.includes("天気: 晴れ、20度"));
  assert.equal(prompt.includes("天候情報が不明"), false);
});
