const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  applyRecentPhraseValidation,
  loadSafetyConfig,
  readSafetyConfig,
  pickFallback,
  repairTimeSignalPost,
  timeBand,
  validateTimeSignalText,
} = require("../functions/timeSignalSafety");
const { saveRecentPhrases } = require("../functions/recentPhrases");

const safetyConfig = {
  fallbackLogFile: "time_signal_fallbacks.json",
  fallbackLogLimit: 10,
  commonDangerTerms: ["Analysis", "静けさ"],
  concreteTerms: ["カーテン", "机", "カップ", "台所"],
  unknownWeatherTerms: ["雨", "晴れ", "曇り", "雪", "風", "夜風", "揺れ", "揺れる"],
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

test("safety config reader supports injected missing file and custom content", () => {
  assert.deepEqual(
    readSafetyConfig({
      filePath: "/virtual/time_signal_safety.json",
      existsSync: () => false,
    }),
    {
      fallbackLogFile: "time_signal_fallbacks.json",
      fallbackLogLimit: 100,
      commonDangerTerms: [],
      concreteTerms: [],
      unknownWeatherTerms: [],
      timeBands: {},
      defaultFallback: "",
    },
  );

  const config = loadSafetyConfig({
    filePath: "/virtual/time_signal_safety.json",
    existsSync: () => true,
    readFileSync: () => JSON.stringify({
      commonDangerTerms: ["危険"],
      defaultFallback: "机にカップがある。",
    }),
  });

  assert.deepEqual(config.commonDangerTerms, ["危険"]);
  assert.equal(config.defaultFallback, "机にカップがある。");
  assert.deepEqual(config.concreteTerms, []);
});

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

test("validateTimeSignalText rejects dark morning expressions", () => {
  const result = validateTimeSignalText(
    "窓の向こうに、空はまだ薄暗い。",
    { hour: 8, timeText: "morning" },
    {
      ...safetyConfig,
      concreteTerms: [...safetyConfig.concreteTerms, "窓"],
      timeBands: {
        ...safetyConfig.timeBands,
        morning: {
          ...safetyConfig.timeBands.morning,
          blocked: [...safetyConfig.timeBands.morning.blocked, "薄暗", "暗く"],
        },
      },
    },
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("time_mismatch:薄暗"));
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

test("pickFallback avoids recently used fallback candidates", (t) => {
  const tempBaseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(tempBaseDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(tempBaseDir, "test-recent-fallback-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const settings = {
    memoryDir: path.relative(process.cwd(), tempDir),
    aiName: "夜宮 灯",
  };
  const repeated = "机の上にマグカップを置き、朝の支度を始める。";
  const alternate = "洗面台の水音がして、マグカップが机に置いてある。";

  saveRecentPhrases(settings, repeated, 10);

  assert.equal(
    pickFallback(
      { hour: 8, timeText: "morning" },
      {
        ...safetyConfig,
        timeBands: {
          morning: { fallback: [repeated, alternate], blocked: [] },
        },
      },
      settings,
    ),
    alternate,
  );
});

test("applyRecentPhraseValidation rejects repeated generated text", (t) => {
  const tempBaseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(tempBaseDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(tempBaseDir, "test-recent-validation-"));
  t.after(() => fs.rmSync(tempDir, { recursive: true, force: true }));
  const settings = {
    memoryDir: path.relative(process.cwd(), tempDir),
    aiName: "夜宮 灯",
  };
  const text = "机の上にカップを置いて、台所の音を聞いている。";

  saveRecentPhrases(settings, text, 10);

  assert.deepEqual(
    applyRecentPhraseValidation({ safe: true, reasons: [] }, settings, text),
    { safe: false, reasons: ["recent_phrase"] },
  );
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


test("validateTimeSignalText rejects weather terms when weather is unknown", () => {
  const result = validateTimeSignalText(
    "机の上のカップに雨の音が近づく。",
    { hour: 21, timeText: "night", weather: { summary: "unknown" } },
    safetyConfig,
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("weather_unknown:雨"));
});

test("validateTimeSignalText rejects wind terms when weather is unknown", () => {
  const result = validateTimeSignalText(
    "机の上のカップに夜風が近づく。",
    { hour: 21, timeText: "night", weather: { summary: "unknown" } },
    safetyConfig,
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("weather_unknown:風"));
});

test("validateTimeSignalText rejects swaying terms when weather is unknown", () => {
  const result = validateTimeSignalText(
    "窓際の鉢花が揺れる。",
    { hour: 21, timeText: "evening", weather: { summary: "unknown" } },
    {
      ...safetyConfig,
      concreteTerms: [...safetyConfig.concreteTerms, "窓"],
    },
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("weather_unknown:揺れ"));
});

test("validateTimeSignalText allows weather terms when weather is known", () => {
  const result = validateTimeSignalText(
    "机の上のカップに雨の音が近づく。",
    { hour: 21, timeText: "night", weather: { summary: "雨" } },
    safetyConfig,
  );

  assert.equal(result.reasons.includes("weather_unknown:雨"), false);
});


test("validateTimeSignalText rejects clock meta expressions", () => {
  const result = validateTimeSignalText(
    "寝ぼけ眼で片付けたマグカップを見つめ、時計を見落としてしまった。",
    { hour: 8, timeText: "morning" },
    {
      ...safetyConfig,
      commonDangerTerms: [...safetyConfig.commonDangerTerms, "時計", "見落と"],
      concreteTerms: [...safetyConfig.concreteTerms, "マグカップ"],
    },
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("danger:時計"));
});

test("validateTimeSignalText rejects awkward phrases from observed history", () => {
  const config = {
    ...safetyConfig,
    commonDangerTerms: [
      ...safetyConfig.commonDangerTerms,
      "視線を逸らす",
      "手を洗う",
      "冷めたカップから湯気",
      "思い出す頃",
      "寝ぼけ眼",
    ],
    concreteTerms: [
      ...safetyConfig.concreteTerms,
      "マグカップ",
      "流し",
      "飲み物",
      "窓",
    ],
  };

  assert.ok(
    validateTimeSignalText(
      "寝る前の部屋で片づけたカップから視線を逸らす。",
      { hour: 0, timeText: "night" },
      config,
    ).reasons.includes("danger:視線を逸らす"),
  );
  assert.ok(
    validateTimeSignalText(
      "机の上で手を洗う。",
      { hour: 8, timeText: "morning" },
      config,
    ).reasons.includes("danger:手を洗う"),
  );
  assert.ok(
    validateTimeSignalText(
      "冷めたカップから湯気を上げる。",
      { hour: 21, timeText: "evening" },
      config,
    ).reasons.includes("danger:冷めたカップから湯気"),
  );
  assert.ok(
    validateTimeSignalText(
      "窓際のコーヒーを思い出す頃。",
      { hour: 14, timeText: "daytime" },
      config,
    ).reasons.includes("danger:思い出す頃"),
  );
  assert.ok(
    validateTimeSignalText(
      "寝ぼけ眼で片付けた台所のカップ。",
      { hour: 9, timeText: "morning" },
      config,
    ).reasons.includes("danger:寝ぼけ眼"),
  );
});

test("validateTimeSignalText rejects fading light in morning and daytime", () => {
  const config = {
    ...safetyConfig,
    commonDangerTerms: [
      ...safetyConfig.commonDangerTerms,
      "遠ざかる",
      "薄れて",
      "薄れる",
    ],
    concreteTerms: [...safetyConfig.concreteTerms, "流し", "窓"],
    timeBands: {
      ...safetyConfig.timeBands,
      morning: {
        ...safetyConfig.timeBands.morning,
        blocked: [
          ...safetyConfig.timeBands.morning.blocked,
          "遠ざかる",
          "薄れて",
          "薄れる",
        ],
      },
      daytime: {
        fallback: ["机の上に、飲み物が置いてある。"],
        blocked: ["遠ざかる", "薄れて", "薄れる"],
      },
    },
  };

  assert.ok(
    validateTimeSignalText(
      "流しで片付けながら、日の光が部屋から遠ざかる。",
      { hour: 8, timeText: "morning" },
      config,
    ).reasons.includes("danger:遠ざかる"),
  );
  assert.ok(
    validateTimeSignalText(
      "窓の明るさが少しずつ薄れてくる。",
      { hour: 9, timeText: "morning" },
      config,
    ).reasons.includes("danger:薄れて"),
  );
});

test("validateTimeSignalText rejects malformed quiet expressions", () => {
  const result = validateTimeSignalText(
    "部屋の静けしさは、夜の息抜きに丁度良い。",
    { hour: 21, timeText: "night" },
    {
      ...safetyConfig,
      commonDangerTerms: [...safetyConfig.commonDangerTerms, "静けし", "丁度良い"],
      concreteTerms: [...safetyConfig.concreteTerms, "部屋"],
    },
  );

  assert.equal(result.safe, false);
  assert.ok(result.reasons.includes("danger:静けし"));
});
