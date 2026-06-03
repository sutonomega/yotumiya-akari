const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  canPostToX,
  getXCredentials,
  hasRecentDuplicate,
  isXDryRun,
  normalizeTweetText,
  postTweet,
  rememberXPost,
} = require("../functions/xClient");

function tempSettings(t, extra = {}) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "x-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return {
    memoryDir: path.relative(process.cwd(), dir),
    xMaxLength: 20,
    xRateLimitPer15Min: 2,
    ...extra,
  };
}

function restoreEnv(t, key) {
  const previous = process.env[key];
  t.after(() => {
    if (previous === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previous;
    }
  });
}

test("normalizeTweetText trims, rejects empty text, and truncates long text", () => {
  assert.equal(normalizeTweetText("  hello  ", 20), "hello");
  assert.equal(normalizeTweetText("123456", 5), "1234…");
  assert.throws(() => normalizeTweetText("   "), /empty/);
});

test("getXCredentials throws when required env is missing", (t) => {
  for (const key of ["X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET"]) {
    restoreEnv(t, key);
    delete process.env[key];
  }

  assert.throws(() => getXCredentials(), /Missing X OAuth/);
});

test("getXCredentials reads OAuth env values", (t) => {
  const values = {
    X_API_KEY: "key",
    X_API_KEY_SECRET: "secret",
    X_ACCESS_TOKEN: "token",
    X_ACCESS_TOKEN_SECRET: "access-secret",
  };
  for (const [key, value] of Object.entries(values)) {
    restoreEnv(t, key);
    process.env[key] = value;
  }

  assert.deepEqual(getXCredentials(), {
    appKey: "key",
    appSecret: "secret",
    accessToken: "token",
    accessSecret: "access-secret",
  });
});

test("isXDryRun respects env override before settings", (t) => {
  restoreEnv(t, "X_DRY_RUN");

  process.env.X_DRY_RUN = "true";
  assert.equal(isXDryRun({ xDryRun: false }), true);

  process.env.X_DRY_RUN = "false";
  assert.equal(isXDryRun({ xDryRun: true }), false);

  delete process.env.X_DRY_RUN;
  assert.equal(isXDryRun({ xDryRun: true }), true);
});

test("rememberXPost stores recent post state and canPostToX enforces rate limit", (t) => {
  const settings = tempSettings(t);
  const now = new Date("2026-06-03T12:00:00.000Z");

  rememberXPost(settings, "first", now);
  rememberXPost(settings, "second", new Date("2026-06-03T12:01:00.000Z"));

  assert.equal(hasRecentDuplicate(settings, "first"), true);
  assert.deepEqual(canPostToX(settings, new Date("2026-06-03T12:02:00.000Z")), {
    allowed: false,
    recent: ["2026-06-03T12:00:00.000Z", "2026-06-03T12:01:00.000Z"],
  });
  assert.equal(canPostToX(settings, new Date("2026-06-03T12:30:00.000Z")).allowed, true);
});

test("postTweet records dry-run posts without external API", async (t) => {
  const settings = tempSettings(t, { xDryRun: true });

  const result = await postTweet({ text: " 投稿本文 ", settings });

  assert.deepEqual(result, { dryRun: true, text: "投稿本文" });
  assert.equal(hasRecentDuplicate(settings, "投稿本文"), true);
});

test("postTweet blocks duplicate and rate limited posts", async (t) => {
  const settings = tempSettings(t, { xDryRun: true, xRateLimitPer15Min: 1 });

  await postTweet({ text: "first", settings });

  await assert.rejects(() => postTweet({ text: "first", settings }), /duplicate/);
  await assert.rejects(() => postTweet({ text: "second", settings }), /rate limit/);
});

test("postTweet sends through provided client when not dry-run", async (t) => {
  restoreEnv(t, "X_DRY_RUN");
  process.env.X_DRY_RUN = "false";
  const settings = tempSettings(t, { xDryRun: false });
  const tweets = [];
  const client = {
    v2: {
      tweet: async (text) => {
        tweets.push(text);
        return { id: "tweet-1", text };
      },
    },
  };

  const result = await postTweet({ text: "hello", settings, client });

  assert.deepEqual(tweets, ["hello"]);
  assert.deepEqual(result, { id: "tweet-1", text: "hello" });
  assert.equal(hasRecentDuplicate(settings, "hello"), true);
});
