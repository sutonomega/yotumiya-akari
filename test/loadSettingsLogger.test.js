const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const loadSettings = require("../functions/loadSettings");

test("loadSettings merges settings.local.json over base settings", (t) => {
  const localPath = path.join(process.cwd(), "config", "settings.local.json");
  const existed = fs.existsSync(localPath);
  const previous = existed ? fs.readFileSync(localPath, "utf-8") : null;
  t.after(() => {
    if (existed) {
      fs.writeFileSync(localPath, previous, "utf-8");
    } else if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  });

  fs.writeFileSync(localPath, JSON.stringify({ replyMaxLength: 12345, testOnlyValue: true }), "utf-8");

  const settings = loadSettings();
  assert.equal(settings.replyMaxLength, 12345);
  assert.equal(settings.testOnlyValue, true);
  assert.equal(settings.chatModel, "qwen2.5:3b");
});

test("logger writes normalized log lines and supports helpers", async (t) => {
  const log = require("../functions/logger");
  const logPath = path.join(process.cwd(), "logs", "app.log");
  const existed = fs.existsSync(logPath);
  const previous = existed ? fs.readFileSync(logPath, "utf-8") : null;
  t.after(() => {
    log.close();
    if (existed) {
      fs.writeFileSync(logPath, previous, "utf-8");
    } else if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });

  log("info", "test message", { ok: true });
  log.system("system message");
  await new Promise((resolve) => setTimeout(resolve, 20));
  log.close();

  const content = fs.readFileSync(logPath, "utf-8");
  assert.ok(content.includes('[INFO] test message {"ok":true}'));
  assert.ok(content.includes("[SYSTEM] system message"));
  assert.equal(log.types.INFO, "INFO");
});

test("logger defaults to INFO type when type is omitted", async (t) => {
  const log = require("../functions/logger");
  const logPath = path.join(process.cwd(), "logs", "app.log");
  const existed = fs.existsSync(logPath);
  const previous = existed ? fs.readFileSync(logPath, "utf-8") : null;
  t.after(() => {
    log.close();
    if (existed) {
      fs.writeFileSync(logPath, previous, "utf-8");
    } else if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });

  log(null, "default type message");
  await new Promise((resolve) => setTimeout(resolve, 20));
  log.close();

  const content = fs.readFileSync(logPath, "utf-8");
  assert.ok(content.includes("[INFO] default type message"));
});


test("createLogger supports injected log path and filesystem", () => {
  const defaultLog = require("../functions/logger");
  const writes = [];
  const dirs = [];
  const fakeFs = {
    existsSync: () => false,
    mkdirSync: (dir, options) => dirs.push({ dir, options }),
    createWriteStream: (filePath, options) => {
      writes.push({ filePath, options, chunks: [] });
      return {
        write: (chunk) => writes[writes.length - 1].chunks.push(chunk),
        end: () => writes[writes.length - 1].ended = true,
      };
    },
  };
  const consoleLines = [];
  const log = defaultLog.createLogger({
    logPath: "/virtual/logs/test.log",
    fsModule: fakeFs,
    consoleLog: (line) => consoleLines.push(line),
    now: () => new Date("2026-06-06T00:00:00.000Z"),
  });

  log("info", "injected message", { ok: true });
  log.close();

  assert.deepEqual(dirs, [{ dir: "/virtual/logs", options: { recursive: true } }]);
  assert.equal(writes[0].filePath, "/virtual/logs/test.log");
  assert.ok(writes[0].chunks[0].includes('[INFO] injected message {"ok":true}'));
  assert.equal(writes[0].ended, true);
  assert.ok(consoleLines[0].includes("2026-06-06T00:00:00.000Z"));
});
