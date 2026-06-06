const test = require("node:test");
const assert = require("node:assert/strict");

const {
  categoryInstruction,
  classifyConversation,
  loadConversationCategoryConfig,
  readConversationCategoryConfig,
  reloadConversationCategoryConfig,
} = require("../functions/conversationCategory");

test("classifies technical conversation", () => {
  assert.equal(
    classifyConversation("APIエラーの原因と修正方法を確認したい", { hour: 14 }),
    "technical",
  );
});

test("classifies emotional conversation", () => {
  assert.equal(
    classifyConversation("今日は疲れたし少し不安", { hour: 14 }),
    "emotional",
  );
});

test("adds sleepy bias at deep night", () => {
  assert.equal(classifyConversation("少し話そう", { hour: 2 }), "sleepy");
});

test("category instruction is loaded from config", () => {
  assert.ok(categoryInstruction("technical").includes("技術相談"));
});

test("config loader caches and reloads config", () => {
  const first = loadConversationCategoryConfig();
  const second = loadConversationCategoryConfig();
  assert.strictEqual(first, second);
  assert.notStrictEqual(reloadConversationCategoryConfig, undefined);
  assert.notStrictEqual(reloadConversationCategoryConfig(), first);
});

test("technical signal wins over one playful signal", () => {
  assert.equal(classifyConversation("APIエラー www", { hour: 14 }), "technical");
});


test("config reader supports injected missing file and custom file content", () => {
  assert.deepEqual(
    readConversationCategoryConfig({
      filePath: "/virtual/conversation_category.json",
      existsSync: () => false,
    }),
    {
      categories: ["casual"],
      signals: {},
      instructions: { default: "" },
      sleepyHourStart: 0,
      sleepyHourEnd: 6,
    },
  );

  const config = loadConversationCategoryConfig({
    filePath: "/virtual/conversation_category.json",
    existsSync: () => true,
    readFileSync: () => JSON.stringify({
      categories: ["custom"],
      signals: { custom: ["hello"] },
      instructions: { custom: "custom instruction" },
    }),
  });

  assert.deepEqual(config.categories, ["custom"]);
  assert.deepEqual(config.signals.custom, ["hello"]);
  assert.equal(config.instructions.custom, "custom instruction");
});
