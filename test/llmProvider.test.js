const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createLlmProvider,
  messagePrompt,
  stripThinking,
} = require("../functions/llmProvider");

function mockFetch(responseBody, calls) {
  return async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return {
      status: 200,
      async json() {
        return responseBody;
      },
    };
  };
}

test("stripThinking removes Ollama thinking blocks", () => {
  assert.equal(stripThinking("<think>hidden</think> 表示する"), "表示する");
});

test("messagePrompt joins messages for debugging", () => {
  assert.equal(
    messagePrompt([
      { role: "system", content: "sys" },
      { role: "user", content: "hello" },
    ]),
    "system: sys\n\nuser: hello",
  );
});

test("ollama chat posts to /api/chat and strips thinking", async (t) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = mockFetch({ message: { content: "<think>x</think>返答" } }, calls);
  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = createLlmProvider({
    llmProvider: "ollama",
    ollamaBaseUrl: "http://ollama.test",
    chatModel: "qwen2.5:3b",
    temperature: 0.1,
  });

  const result = await provider.chat([{ role: "user", content: "hi" }]);

  assert.equal(result, "返答");
  assert.equal(calls[0].url, "http://ollama.test/api/chat");
  assert.equal(calls[0].body.model, "qwen2.5:3b");
  assert.equal(calls[0].body.stream, false);
  assert.deepEqual(calls[0].body.messages, [{ role: "user", content: "hi" }]);
});

test("ollama chat throws on invalid response", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch({ error: "bad model" }, []);
  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = createLlmProvider({ llmProvider: "ollama", chatModel: "qwen" });

  await assert.rejects(
    () => provider.chat([{ role: "user", content: "hi" }]),
    /Ollama response invalid: bad model/,
  );
});

test("ollama generate posts to /api/generate and strips thinking", async (t) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = mockFetch({ response: "<think>x</think>生成" }, calls);
  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = createLlmProvider({
    llmProvider: "ollama",
    ollamaBaseUrl: "http://ollama.test",
    chatModel: "chat-model",
  });

  const result = await provider.generate("prompt", { model: "generate-model" });

  assert.equal(result, "生成");
  assert.equal(calls[0].url, "http://ollama.test/api/generate");
  assert.equal(calls[0].body.model, "generate-model");
  assert.equal(calls[0].body.prompt, "prompt");
});

test("ollama generate throws on error response", async (t) => {
  const originalFetch = global.fetch;
  global.fetch = mockFetch({ error: "generate failed" }, []);
  t.after(() => {
    global.fetch = originalFetch;
  });

  const provider = createLlmProvider({ llmProvider: "ollama", chatModel: "qwen" });

  await assert.rejects(() => provider.generate("prompt"), /Ollama generate failed/);
});

test("openai chat uses mocked completion API and strips thinking", async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const calls = [];
  process.env.OPENAI_API_KEY = "test-openai-key";
  global.fetch = mockFetch({ choices: [{ message: { content: "<think>x</think>OpenAI返答" } }] }, calls);
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  const provider = createLlmProvider({
    llmProvider: "openai",
    chatModel: "fallback-model",
    openAIModel: "openai-model",
    temperature: 0.2,
  });

  const result = await provider.chat([{ role: "user", content: "hi" }]);

  assert.equal(result, "OpenAI返答");
  assert.equal(calls[0].url, "https://api.openai.com/v1/chat/completions");
  assert.equal(calls[0].body.model, "fallback-model");
  assert.equal(calls[0].body.temperature, 0.2);
});

test("openai provider requires API key", async (t) => {
  const originalKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  t.after(() => {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  const provider = createLlmProvider({ llmProvider: "openai", chatModel: "openai-model" });
  await assert.rejects(
    () => provider.chat([{ role: "user", content: "hi" }]),
    /OPENAI_API_KEY is required/,
  );
});

test("claude chat uses mocked messages API and strips thinking", async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;
  const calls = [];
  process.env.ANTHROPIC_API_KEY = "test-claude-key";
  global.fetch = mockFetch({ content: [{ text: "<think>x</think>Claude" }, { text: "返答" }] }, calls);
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  const provider = createLlmProvider({
    llmProvider: "claude",
    chatModel: "fallback-model",
    claudeModel: "claude-model",
    maxTokens: 123,
    temperature: 0.3,
  });

  const result = await provider.chat([
    { role: "system", content: "system prompt" },
    { role: "user", content: "hi" },
  ]);

  assert.equal(result, "Claude返答");
  assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(calls[0].body.model, "fallback-model");
  assert.equal(calls[0].body.system, "system prompt");
  assert.deepEqual(calls[0].body.messages, [{ role: "user", content: "hi" }]);
  assert.equal(calls[0].body.max_tokens, 123);
});

test("claude provider requires API key", async (t) => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  t.after(() => {
    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  const provider = createLlmProvider({ llmProvider: "claude", chatModel: "claude-model" });
  await assert.rejects(
    () => provider.chat([{ role: "user", content: "hi" }]),
    /ANTHROPIC_API_KEY is required/,
  );
});

test("non-ollama generate delegates to chat", async (t) => {
  const originalFetch = global.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const calls = [];
  process.env.OPENAI_API_KEY = "test-openai-key";
  global.fetch = mockFetch({ choices: [{ message: { content: "生成返答" } }] }, calls);
  t.after(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalKey;
    }
  });

  const provider = createLlmProvider({ llmProvider: "openai", chatModel: "chat-model" });
  const result = await provider.generate("prompt text", { model: "generate-model" });

  assert.equal(result, "生成返答");
  assert.equal(calls[0].body.model, "generate-model");
  assert.deepEqual(calls[0].body.messages, [{ role: "user", content: "prompt text" }]);
});
