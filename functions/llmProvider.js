function stripThinking(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .trim();
}

function messagePrompt(messages) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n\n");
}

async function callOllamaChat(settings, messages, model = settings.chatModel) {
  const response = await fetch(`${settings.ollamaBaseUrl || "http://localhost:11434"}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: settings.temperature,
      },
    }),
  });

  const data = await response.json();
  const content = data?.message?.content;

  if (!content) {
    throw new Error(`Ollama response invalid: ${data?.error || response.status}`);
  }

  return stripThinking(content);
}

async function callOllamaGenerate(settings, prompt, model) {
  const response = await fetch(`${settings.ollamaBaseUrl || "http://localhost:11434"}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  const data = await response.json();
  if (data?.error) {
    throw new Error(`Ollama generate failed: ${data.error}`);
  }
  return stripThinking(data?.response || "");
}

async function callOpenAI(settings, messages, model = settings.openAIModel || settings.chatModel) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for OpenAI provider");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: settings.temperature,
    }),
  });

  const data = await response.json();
  return stripThinking(data?.choices?.[0]?.message?.content || "");
}

async function callClaude(settings, messages, model = settings.claudeModel || settings.chatModel) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is required for Claude provider");
  }

  const system = messages.find((message) => message.role === "system")?.content || "";
  const conversation = messages.filter((message) => message.role !== "system");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: settings.maxTokens || 512,
      system,
      messages: conversation,
      temperature: settings.temperature,
    }),
  });

  const data = await response.json();
  return stripThinking((data?.content || []).map((part) => part.text || "").join(""));
}

function createLlmProvider(settings) {
  const provider = settings.llmProvider || "ollama";

  return {
    chat(messages, options = {}) {
      const model = options.model || settings.chatModel;

      if (provider === "openai") {
        return callOpenAI(settings, messages, model);
      }

      if (provider === "claude") {
        return callClaude(settings, messages, model);
      }

      return callOllamaChat(settings, messages, model);
    },

    generate(prompt, options = {}) {
      const model = options.model || settings.chatModel;
      const messages = [{ role: "user", content: prompt }];

      if (provider === "ollama") {
        return callOllamaGenerate(settings, prompt, model);
      }

      return this.chat(messages, { model });
    },
  };
}

module.exports = {
  createLlmProvider,
  messagePrompt,
  stripThinking,
};
