const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { shouldRunNightly } = require("../functions/nightlyProcess");

function tempSettings(t, overrides = {}) {
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const dir = fs.mkdtempSync(path.join(baseDir, "nightly-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { memoryDir: path.relative(process.cwd(), dir), ...overrides };
}

test("shouldRunNightly returns false when nightly process is disabled", (t) => {
  const settings = tempSettings(t, {
    enableNightlyProcess: false,
    nightlyProcessHour: 3,
  });

  assert.equal(shouldRunNightly(settings, new Date(2026, 5, 6, 3)), false);
});

test("shouldRunNightly runs at configured hour when enabled", (t) => {
  const settings = tempSettings(t, {
    enableNightlyProcess: true,
    nightlyProcessHour: 3,
  });

  assert.equal(shouldRunNightly(settings, new Date(2026, 5, 6, 3)), true);
  assert.equal(shouldRunNightly(settings, new Date(2026, 5, 6, 4)), false);
});
