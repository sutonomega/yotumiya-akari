const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  appendVisualLog,
  preserveMemory,
  restoreFiles,
  snapshotFiles,
} = require("../scripts/test-time-post");

function tempSettings(t) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "time-post-script-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { memoryDir: path.relative(process.cwd(), dir) };
}

test("preserveMemory is enabled by default and disabled only by explicit 0", (t) => {
  const previous = process.env.YORUMIYA_TEST_PRESERVE_MEMORY;
  t.after(() => {
    if (previous === undefined) {
      delete process.env.YORUMIYA_TEST_PRESERVE_MEMORY;
    } else {
      process.env.YORUMIYA_TEST_PRESERVE_MEMORY = previous;
    }
  });

  delete process.env.YORUMIYA_TEST_PRESERVE_MEMORY;
  assert.equal(preserveMemory(), true);

  process.env.YORUMIYA_TEST_PRESERVE_MEMORY = "1";
  assert.equal(preserveMemory(), true);

  process.env.YORUMIYA_TEST_PRESERVE_MEMORY = "0";
  assert.equal(preserveMemory(), false);
});

test("snapshotFiles and restoreFiles preserve existing and missing state files", (t) => {
  const settings = tempSettings(t);
  const memoryDir = path.join(process.cwd(), settings.memoryDir);
  fs.mkdirSync(memoryDir, { recursive: true });
  const existingPath = path.join(memoryDir, "recent_phrases.json");
  const missingPath = path.join(memoryDir, "time_signal_fallbacks.json");
  fs.writeFileSync(existingPath, "original", "utf-8");

  const snapshots = snapshotFiles(settings, ["recent_phrases.json", "time_signal_fallbacks.json"]);
  fs.writeFileSync(existingPath, "changed", "utf-8");
  fs.writeFileSync(missingPath, "created", "utf-8");

  restoreFiles(snapshots);

  assert.equal(fs.readFileSync(existingPath, "utf-8"), "original");
  assert.equal(fs.existsSync(missingPath), false);
});

test("appendVisualLog writes a manual review log entry", (t) => {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "visual-log-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  const logPath = path.join(dir, "time-post.txt");
  appendVisualLog({
    hour: 21,
    message: "午後9時\n机の上に、カップが置いてある。",
    logPath,
    date: new Date("2026-06-03T12:00:00.000Z"),
  });

  const content = fs.readFileSync(logPath, "utf-8");
  assert.ok(content.includes("2026-06-03T12:00:00.000Z"));
  assert.ok(content.includes("hour: 21"));
  assert.ok(content.includes("午後9時\n机の上に、カップが置いてある。"));
});