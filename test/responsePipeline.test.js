const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBaseReply,
  loadPrompt,
  personalizeReply,
  runResponsePipeline,
} = require("../functions/responsePipeline");

test("buildBaseReply sanitizes analysis labels from model output", async () => {
  const reply = await buildBaseReply({
    callModel: async () => [
      "Analysis: this should be removed",
      "Conversation Category: casual",
      "机の上に、カップが置いてある。",
    ].join("\n"),
    messages: [],
    analysis: { category: "casual", categoryInstruction: "", memories: [] },
    mode: "post",
    settings: { enableBaseReply: true },
  });

  assert.equal(reply, "机の上に、カップが置いてある。");
});

test("personalizeReply returns sanitized base reply when disabled", async () => {
  const reply = await personalizeReply({
    callModel: async () => "unused",
    baseReply: "Mode: post\nカーテンの隙間から、朝の光が入っている。",
    settings: { enablePersonalizeReply: false },
    mode: "post",
  });

  assert.equal(reply, "カーテンの隙間から、朝の光が入っている。");
});

test("runResponsePipeline wires disabled analysis, base reply, and personalization", async () => {
  const result = await runResponsePipeline({
    settings: {
      enableAnalyzeInput: false,
      enableBaseReply: true,
      enablePersonalizeReply: false,
    },
    userMessage: "",
    currentState: { timeText: "morning" },
    messages: [],
    mode: "post",
    callModel: async () => "Analysis: remove me\n台所で湯気が上がっている。",
  });

  assert.equal(result.analysis.category, "casual");
  assert.equal(result.finalReply, "台所で湯気が上がっている。");
});


test("analyzeInput retrieves category and memory when enabled", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const baseDir = path.join(process.cwd(), "tmp");
  fs.mkdirSync(baseDir, { recursive: true });
  const tempDir = fs.mkdtempSync(path.join(baseDir, "analysis-memory-"));
  try {
    fs.writeFileSync(
      path.join(tempDir, "long_memory.txt"),
      "- [technical] permanent API エラー #dev\n",
      "utf-8",
    );

    const { analyzeInput } = require("../functions/responsePipeline");
    const result = await analyzeInput({
      settings: { enableAnalyzeInput: true, memoryDir: path.relative(process.cwd(), tempDir) },
      userMessage: "APIエラーの修正を確認したい",
      currentState: { hour: 14, timeText: "daytime" },
    });

    assert.equal(result.category, "technical");
    assert.ok(result.categoryInstruction.includes("技術相談"));
    assert.equal(result.memories.length, 1);
    assert.equal(result.timeText, "daytime");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("buildBaseReply returns empty when disabled", async () => {
  const reply = await buildBaseReply({
    callModel: async () => "unused",
    messages: [],
    analysis: { category: "casual", categoryInstruction: "", memories: [] },
    mode: "post",
    settings: { enableBaseReply: false },
  });

  assert.equal(reply, "");
});

test("personalizeReply calls model and sanitizes when enabled", async () => {
  const reply = await personalizeReply({
    callModel: async () => "Draft: remove\n流しにカップを置いている。",
    baseReply: "draft",
    settings: { enablePersonalizeReply: true },
    mode: "post",
  });

  assert.equal(reply, "流しにカップを置いている。");
});


test("loadPrompt supports injected filesystem boundaries", () => {
  assert.equal(
    loadPrompt("missing.txt", {
      baseDir: "/virtual",
      existsSync: () => false,
    }),
    "",
  );

  assert.equal(
    loadPrompt("rules.txt", {
      baseDir: "/virtual",
      existsSync: () => true,
      readFileSync: (filePath) => `loaded:${filePath}`,
    }),
    "loaded:/virtual/prompts/rules.txt",
  );
});

test("response pipeline accepts injected prompt loader", async () => {
  const seenPrompts = [];
  const result = await runResponsePipeline({
    settings: {
      enableAnalyzeInput: false,
      enableBaseReply: true,
      enablePersonalizeReply: true,
    },
    userMessage: "",
    currentState: { timeText: "night" },
    messages: [],
    mode: "post",
    promptLoader: (fileName) => {
      seenPrompts.push(fileName);
      return fileName === "response_base_rules.txt"
        ? "base {{analysisText}}"
        : "personalize";
    },
    callModel: async (messages) => {
      const system = messages.find((message) => message.role === "system")?.content || "";
      return system.includes("personalize")
        ? "Final: remove\n机にカップを置いている。"
        : "Draft: remove\n台所にカップがある。";
    },
  });

  assert.deepEqual(seenPrompts, ["response_base_rules.txt", "response_personalize.txt"]);
  assert.equal(result.baseReply, "台所にカップがある。");
  assert.equal(result.finalReply, "机にカップを置いている。");
});
