const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  loadMemoryItems,
  parseMemoryLine,
  retrieveMemory,
  tokenize,
} = require("../functions/memoryRetrieval");

function tempSettings(t) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "memory-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { memoryDir: path.relative(process.cwd(), dir) };
}

test("tokenize normalizes words", () => {
  assert.deepEqual(tokenize("API, node-test_1!"), ["api", "node-test_1"]);
});

test("parseMemoryLine extracts tags, category, importance, and keywords", () => {
  const item = parseMemoryLine("- [technical] permanent API設定 #dev");

  assert.equal(item.category, "technical");
  assert.equal(item.importance, "permanent");
  assert.deepEqual(item.tags, ["dev"]);
  assert.ok(item.keywords.includes("api設定"));
});

test("loadMemoryItems returns empty when long memory file is missing", (t) => {
  assert.deepEqual(loadMemoryItems(tempSettings(t)), []);
});

test("retrieveMemory scores by word, tag, category, importance, and permanent boost", (t) => {
  const settings = tempSettings(t);
  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),
    [
      "- [technical] permanent API 設定 #dev",
      "- [emotional] middle 疲れた時の会話 #care",
      "- [casual] short 雑談メモ #chat",
    ].join("\n"),
    "utf-8",
  );

  const items = retrieveMemory(
    settings,
    { text: "API", tags: ["dev"], category: "technical", importance: "permanent" },
    { limit: 2 },
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].category, "technical");
  assert.equal(items[0].score, 10);
});
