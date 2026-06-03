const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  loadSafetyConfig,
  pickFallback,
  repairTimeSignalPost,
  timeBand,
  validateTimeSignalText,
} = require("../functions/timeSignalSafety");

const safetyConfig = {
  fallbackLogFile: "time_signal_fallbacks.json",
  fallbackLogLimit: 10,
  commonDangerTerms: ["Analysis", "静けさ"],
  concreteTerms: ["カーテン", "机", "カップ", "台所"],
  defaultFallback: "机の上に、カップが置いてある。",
  timeBands: {
    morning: {
      fallback: ["カーテンの隙間から、朝の光が入っている。"],
      blocked: ["夕飯"],
    },
    night: {
      fallback: ["机の上に、カップが置いてある。"],
      blocked: ["朝の支度"],
    },
  },
};

test("timeBand uses currentState.timeText", () => {
  assert.equal(timeBand({ hour: 12, timeText: "daytime" }), "daytime");
  assert.equal(timeBand({ hour: 3 }), "night");
});

test("validateTimeSignalText rejects metadata, ascii, time duplication, and missing concrete terms", () => {
  const result = validateTimeSignalText(
    "午後9時 Analysis test",
    { hour: 21, timeText: "night" },
    safetyConfig,
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("ascii_letters"));
  assert.ok(result.reasons.includes("time_in_body"));
  assert.ok(result.reasons.includes("danger:Analysis"));
  assert.ok(result.reasons.includes("no_concrete_object"));
});

test("validateTimeSignalText rejects time-band mismatch", () => {
  const result = validateTimeSignalText(
    "台所で夕飯の支度をしている。",
    { hour: 8, timeText: "morning" },
    safetyConfig,
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("time_mismatch:夕飯"));
});

test("validateTimeSignalText accepts safe concrete text", () => {
  const result = validateTimeSignalText(
    "カーテンの隙間から、朝の光が入っている。",
    { hour: 8, timeText: "morning" },
    safetyConfig,
  );

  assert.deepEqual(result, { safe: true, reasons: [] });
});

test("pickFallback selects fallback for current timeText", () => {
  assert.equal(
    pickFallback({ hour: 8, timeText: "morning" }, safetyConfig),
    "カーテンの隙間から、朝の光が入っている。",
  );
});

test("repairTimeSignalPost falls back and writes fallback log", async (t) => {
  const tempBaseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(tempBaseDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(tempBaseDir, "test-memory-case-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const settings = {
    memoryDir: path.relative(process.cwd(), tempDir),
    timeSignalRepairMaxAttempts: 1,
  };

  const repair = await repairTimeSignalPost({
    settings,
    currentState: { hour: 8, timeText: "morning" },
    message: "Analysis: 静けさが深まる。",
    regenerate: async () => "Analysis: 夕飯の時間です。",
  });

  assert.equal(repair.fallbackUsed, true);
  assert.ok(loadSafetyConfig().timeBands.morning.fallback.includes(repair.message));
  assert.equal(repair.attempts, 1);

  const log = JSON.parse(
    fs.readFileSync(path.join(tempDir, "time_signal_fallbacks.json"), "utf-8"),
  );
  assert.equal(log.items.length, 1);
  assert.equal(log.items[0].timeText, "morning");
  assert.equal(log.items[0].fallbackText, repair.message);
});


test("validateTimeSignalText rejects too short, too long, and polite form", () => {
  assert.ok(validateTimeSignalText("机", { timeText: "night" }, safetyConfig).reasons.includes("too_short"));
  assert.ok(validateTimeSignalText("机".repeat(80), { timeText: "night" }, safetyConfig).reasons.includes("too_long"));
  assert.ok(validateTimeSignalText("机にカップがあります。", { timeText: "night" }, safetyConfig).reasons.includes("polite_form"));
});

test("pickFallback uses default fallback when band has no candidates", () => {
  assert.equal(pickFallback({ timeText: "daytime" }, safetyConfig), "机の上に、カップが置いてある。");
});

test("repairTimeSignalPost returns regenerated safe text", async () => {
  const result = await repairTimeSignalPost({
    settings: { timeSignalRepairMaxAttempts: 1, memoryDir: "tmp/no-write-needed" },
    currentState: { hour: 8, timeText: "morning" },
    message: "Analysis: 静けさが深まる。",
    regenerate: async () => "カーテンの隙間から、朝の光が入っている。",
  });

  assert.deepEqual(result, {
    fallbackUsed: false,
    message: "カーテンの隙間から、朝の光が入っている。",
    attempts: 1,
    reasons: [],
  });
});

test("repairTimeSignalPost records repair failure before fallback", async (t) => {
  const tempBaseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(tempBaseDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(tempBaseDir, "test-memory-repair-fail-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  const result = await repairTimeSignalPost({
    settings: { timeSignalRepairMaxAttempts: 1, memoryDir: path.relative(process.cwd(), tempDir) },
    currentState: { hour: 8, timeText: "morning" },
    message: "Analysis: 静けさが深まる。",
    regenerate: async () => {
      throw new Error("model failed");
    },
  });

  assert.equal(result.fallbackUsed, true);
  assert.ok(result.reasons.some((reason) => reason.startsWith("repair_failed:model failed")));
});

test("safety config loader caches and reloads config", () => {
  const { reloadSafetyConfig } = require("../functions/timeSignalSafety");
  const first = loadSafetyConfig();
  const second = loadSafetyConfig();
  assert.strictEqual(first, second);
  assert.notStrictEqual(reloadSafetyConfig(), first);
});
