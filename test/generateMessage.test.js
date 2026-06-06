const test = require("node:test");
const assert = require("node:assert/strict");

const { buildSystemPrompt } = require("../functions/generateMessage");

test("buildSystemPrompt includes web chat rules only for reply mode", () => {
  const settings = {
    memoryDir: "memory",
    aiName: "夜宮 灯",
    userName: "ガルパチ",
    enableAiProfile: false,
    enableUserProfile: false,
    enableCurrentState: false,
    enableCalendarPrompt: false,
    enableLongMemory: false,
    enableGoodExamples: false,
    enableBadExamples: false,
    enableConversationRules: false,
  };
  const currentState = { calendar: {} };

  assert.ok(buildSystemPrompt(settings, currentState, "reply").includes("WebUIからのコメント会話用ルール"));
  assert.equal(buildSystemPrompt(settings, currentState, "post").includes("WebUIからのコメント会話用ルール"), false);
});
