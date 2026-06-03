const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const parseHistory = require("../functions/parseHistory");
const {
  loadRecentPhrases,
  repetitionPenalty,
  saveRecentPhrases,
  suppressRecentPhrases,
} = require("../functions/recentPhrases");
const {
  getTargets,
  postMessage,
  withRetry,
} = require("../functions/postTarget");

function tempSettings(t) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "recent-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { memoryDir: path.relative(process.cwd(), dir), aiName: "夜宮 灯" };
}

test("parseHistory keeps valid user and assistant lines and removes noisy assistant messages", () => {
  const messages = parseHistory(
    { userName: "ガルパチ", aiName: "夜宮 灯", recentChatLines: 10 },
    [
      "ガルパチ: こんにちは",
      "夜宮 灯: 机の上にカップがある。",
      "夜宮 灯: 。。。。。。",
      "ガルパチ: 次の話",
    ].join("\n"),
  );

  assert.deepEqual(messages, [
    { role: "user", content: "こんにちは" },
    { role: "assistant", content: "机の上にカップがある。" },
    { role: "user", content: "次の話" },
  ]);
});

test("parseHistory limits recent chat lines", () => {
  const messages = parseHistory(
    { userName: "U", aiName: "A", recentChatLines: 2 },
    "U: one\nA: two\nU: three",
  );

  assert.deepEqual(messages, [
    { role: "assistant", content: "two" },
    { role: "user", content: "three" },
  ]);
});

test("recentPhrases saves phrases and detects repetition without mutating message", (t) => {
  const settings = tempSettings(t);
  saveRecentPhrases(settings, "机の上にカップがある長い文章です。窓ぎわに皿がある。", 10);

  assert.deepEqual(loadRecentPhrases(settings).phrases, [
    "机の上にカップがある長い文章です",
    "窓ぎわに皿がある",
  ]);
  assert.equal(repetitionPenalty(settings, "窓ぎわに皿がある。"), 0);
  assert.equal(repetitionPenalty(settings, "机の上にカップがある長い文章です。"), 1);
  assert.equal(suppressRecentPhrases(settings, "机の上にカップがある長い文章です。"), "机の上にカップがある長い文章です。");
});

test("getTargets supports postTargets, postTarget, and default discord", () => {
  assert.deepEqual(getTargets({ postTargets: ["x", "discord"] }), ["x", "discord"]);
  assert.deepEqual(getTargets({ postTarget: "x" }), ["x"]);
  assert.deepEqual(getTargets({}), ["discord"]);
});

test("withRetry retries task until success", async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("retry");
    }
    return "ok";
  }, 1, 0);

  assert.equal(result, "ok");
  assert.equal(attempts, 2);
});

test("postMessage sends to discord channel without external API", async () => {
  const sent = [];
  const results = await postMessage({
    settings: { postTargets: ["discord"], postRetryCount: 0 },
    message: "hello",
    discordChannel: {
      send: async (message) => {
        sent.push(message);
        return { id: "1" };
      },
    },
  });

  assert.deepEqual(sent, ["hello"]);
  assert.deepEqual(results, [{ target: "discord", result: { id: "1" } }]);
});


test("postMessage can send through x dry-run target without external API", async (t) => {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "post-x-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const results = await postMessage({
    settings: {
      memoryDir: path.relative(process.cwd(), dir),
      postTargets: ["x"],
      postRetryCount: 0,
      xDryRun: true,
      xMaxLength: 280,
      xRateLimitPer15Min: 15,
    },
    message: "hello x",
  });

  assert.deepEqual(results, [{ target: "x", result: { dryRun: true, text: "hello x" } }]);
});

test("withRetry throws the last error after retries", async () => {
  await assert.rejects(
    () => withRetry(async () => { throw new Error("last"); }, 1, 0),
    /last/,
  );
});

test("parseHistory skips empty lines and empty speaker content", () => {
  const messages = parseHistory(
    { userName: "U", aiName: "A", recentChatLines: 10 },
    "\nU: \nA: \nU: hello",
  );

  assert.deepEqual(messages, [{ role: "user", content: "hello" }]);
});

test("parseHistory removes repeated assistant messages", () => {
  const messages = parseHistory(
    { userName: "U", aiName: "A", recentChatLines: 10 },
    [
      "A: 机の上にカップがある長い文章です。",
      "A: 机の上にカップがある長い文章です。",
      "A: 。。。。。。",
    ].join("\n"),
  );

  assert.deepEqual(messages, [
    { role: "assistant", content: "机の上にカップがある長い文章です。" },
  ]);
});

test("parseHistory returns empty on invalid settings", () => {
  assert.deepEqual(parseHistory(null, "U: hello"), []);
});

test("recentPhrases ignores protected ai name and returns unchanged message with no penalty", (t) => {
  const settings = tempSettings(t);
  saveRecentPhrases(settings, "夜宮 灯の名前を含む長い文章です。", 10);

  assert.equal(repetitionPenalty(settings, "夜宮 灯の名前を含む長い文章です。"), 0);
  assert.equal(suppressRecentPhrases(settings, "新しいカップが机の上にある。"), "新しいカップが机の上にある。");
});

test("postMessage skips discord when channel is unavailable", async () => {
  const results = await postMessage({
    settings: { postTargets: ["discord"], postRetryCount: 0 },
    message: "hello",
  });

  assert.deepEqual(results, []);
});
