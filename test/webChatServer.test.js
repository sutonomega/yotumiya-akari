const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildWebChatSettings,
  createWebChatApp,
} = require("../webChatServer");

test("buildWebChatSettings enables web chat specific options without mutating base settings", () => {
  const base = {
    enableAnalyzeInput: false,
    enableCurrentState: false,
    enableWebChatAnalyzeInput: true,
    enableWebChatCurrentState: true,
  };

  const settings = buildWebChatSettings(base);

  assert.equal(settings.enableAnalyzeInput, true);
  assert.equal(settings.enableCurrentState, true);
  assert.equal(base.enableAnalyzeInput, false);
  assert.equal(base.enableCurrentState, false);
});

test("web chat app passes currentState and web chat settings to generateMessage", async (t) => {
  const calls = [];
  const app = createWebChatApp({
    settings: {
      memoryDir: "memory",
      enableAnalyzeInput: false,
      enableCurrentState: false,
      enableWebChatAnalyzeInput: true,
      enableWebChatCurrentState: true,
    },
    getState: async ({ settings, userMessage }) => {
      calls.push({ type: "state", settings, userMessage });
      return { hour: 12, timeText: "daytime", marker: "state" };
    },
    generate: async (request) => {
      calls.push({ type: "generate", request });
      return "返答です。";
    },
    processChatHistory: async (history) => {
      calls.push({ type: "history", history });
    },
    queue: {
      enqueue: async (key, task) => {
        calls.push({ type: "queue", key });
        return task();
      },
    },
  });
  const server = app.listen(0);
  t.after(() => server.close());
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "こんにちは" }),
  });

  assert.deepEqual(await response.json(), { reply: "返答です。" });
  assert.equal(calls.find((call) => call.type === "queue").key, "web-chat:reply");
  assert.equal(calls.find((call) => call.type === "state").settings.enableAnalyzeInput, true);
  assert.deepEqual(calls.find((call) => call.type === "generate").request.currentState, {
    hour: 12,
    timeText: "daytime",
    marker: "state",
  });
  assert.equal(calls.find((call) => call.type === "generate").request.settingsOverride.enableCurrentState, true);
  assert.equal(calls.find((call) => call.type === "history").history.aiMessage, "返答です。");
});
