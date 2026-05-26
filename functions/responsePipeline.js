const {
  categoryInstruction,
  classifyConversation,
} = require("./conversationCategory");
const { retrieveMemory } = require("./memoryRetrieval");

async function analyzeInput({ settings, userMessage, currentState }) {
  const category = classifyConversation(userMessage, currentState);
  const memories = retrieveMemory(
    settings,
    {
      text: userMessage,
      category,
    },
    { limit: 6 },
  );

  return {
    category,
    categoryInstruction: categoryInstruction(category),
    memories,
    timeText: currentState.timeText,
  };
}

async function buildBaseReply({ callModel, messages, analysis, mode }) {
  const analysisText = [
    `conversation category: ${analysis.category}`,
    `instruction: ${analysis.categoryInstruction}`,
    `mode: ${mode}`,
    analysis.memories.length > 0
      ? `relevant memories:\n${analysis.memories.map((item) => item.raw).join("\n")}`
      : "relevant memories: none",
  ].join("\n");

  return callModel([
    ...messages,
    {
      role: "system",
      content: `Analysis for this turn:\n${analysisText}`,
    },
  ]);
}

async function personalizeReply({ callModel, baseReply, settings, mode }) {
  return callModel([
    {
      role: "system",
      content:
        "下書きを自然な日本語に整えてください。" +
        "短く自然にしてください。" +
        "名前だけを出力しないでください。" +
        "説明は不要です。",
    },
    {
      role: "user",
      content: `mode: ${mode}\nDraft:\n${baseReply}`,
    },
  ]);
}

async function runResponsePipeline({
  settings,
  userMessage,
  currentState,
  messages,
  mode,
  callModel,
}) {
  const analysis = await analyzeInput({ settings, userMessage, currentState });
  const baseReply = await buildBaseReply({
    callModel,
    messages,
    analysis,
    mode,
  });
  const finalReply = await personalizeReply({
    callModel,
    baseReply,
    settings,
    mode,
  });

  return {
    analysis,
    baseReply,
    finalReply,
  };
}

module.exports = {
  analyzeInput,
  buildBaseReply,
  personalizeReply,
  runResponsePipeline,
};
