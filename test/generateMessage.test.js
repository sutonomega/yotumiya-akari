const test = require("node:test");
const assert = require("node:assert/strict");

const { buildMessages, buildSystemPrompt } = require("../functions/generateMessage");

function baseSettings(overrides = {}) {
  return {
    memoryDir: "memory",
    aiName: "夜宮 灯",
    userName: "ガルパチ",
    generationMode: "reply",
    enableAiProfile: false,
    enableUserProfile: false,
    enableCurrentState: false,
    enableCalendarPrompt: false,
    enableLongMemory: false,
    enableGoodExamples: false,
    enableBadExamples: false,
    enableConversationRules: false,
    enableWebChatPrompt: false,
    enableRecentChatHistory: false,
    recentChatLines: 30,
    ...overrides,
  };
}

test("buildSystemPrompt uses web chat rules only when settings enable them", () => {
  const currentState = { calendar: {} };
  const webChatPrompt = buildSystemPrompt(
    baseSettings({ enableWebChatPrompt: true }),
    currentState,
  );
  const postPrompt = buildSystemPrompt(
    baseSettings({ generationMode: "post", enableWebChatPrompt: false }),
    currentState,
  );

  assert.ok(webChatPrompt.includes("WebUIからのコメント会話用ルール"));
  assert.equal(postPrompt.includes("WebUIからのコメント会話用ルール"), false);
});

test("buildMessages excludes chat history and web chat rules when post settings disable them", () => {
  const settings = baseSettings({
    generationMode: "post",
    enableWebChatPrompt: false,
    enableRecentChatHistory: false,
  });
  const state = {
    hour: 21,
    timeText: "evening",
    calendar: { prompt: "" },
  };
  const messages = buildMessages({
    settings,
    state,
    recentHistory: `ガルパチ:
バグつらい

夜宮 灯:
分かります。少し休憩を取りながら、またお戻りくださいね。`,
  });

  assert.equal(messages.length, 2);
  assert.equal(messages.some((message) => message.content.includes("バグつらい")), false);
  assert.equal(messages[0].content.includes("WebUIからのコメント会話用ルール"), false);
  assert.ok(messages[1].content.includes("現在の時間帯に合った、静かな時報メッセージ"));
});

test("buildSystemPrompt excludes chat examples when post settings disable them", () => {
  const webChatSettings = baseSettings({
    enableGoodExamples: true,
    enableBadExamples: true,
  });
  const postSettings = baseSettings({
    generationMode: "post",
    enableLongMemory: false,
    enableGoodExamples: false,
    enableBadExamples: false,
  });
  const currentState = { calendar: {} };
  const webChatPrompt = buildSystemPrompt(webChatSettings, currentState);
  const postPrompt = buildSystemPrompt(postSettings, currentState);

  assert.ok(webChatPrompt.includes("good examples"));
  assert.ok(webChatPrompt.includes("bad examples"));
  assert.equal(postPrompt.includes("good examples"), false);
  assert.equal(postPrompt.includes("bad examples"), false);
  assert.equal(postPrompt.includes("バグつらい"), false);
  assert.equal(postPrompt.includes("AIむずかしい"), false);
});

test("buildMessages keeps chat history when web chat settings enable it", () => {
  const settings = baseSettings({
    generationMode: "reply",
    enableRecentChatHistory: true,
  });
  const messages = buildMessages({
    settings,
    state: { calendar: {} },
    userMessage: "こんにちは",
    recentHistory: `ガルパチ:
バグつらい

夜宮 灯:
少し休もう。`,
  });

  assert.ok(messages.some((message) => message.content.includes("バグつらい")));
  assert.equal(messages.at(-1).role, "user");
  assert.equal(messages.at(-1).content, "こんにちは");
});
