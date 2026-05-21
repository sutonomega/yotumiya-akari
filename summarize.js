const fs = require("fs");

async function summarizeMemory() {
  // =========================
  // 会話履歴読み込み
  // =========================

  if (!fs.existsSync("memory/chat_history.txt")) {
    return;
  }

  const chatHistory = fs.readFileSync("memory/chat_history.txt", "utf-8");

  // =========================
  // prompt読み込み
  // =========================

  const memorySummaryPrompt = fs.readFileSync(
    "prompts/memory_summary.txt",
    "utf-8",
  );

  // =========================
  // AIへ送信
  // =========================

  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: "qwen2.5:1.5b",

      stream: false,

      think: false,

      messages: [
        {
          role: "system",
          content: memorySummaryPrompt,
        },
        {
          role: "user",
          content: chatHistory,
        },
      ],
    }),
  });

  const data = await response.json();

  const summary = data.message.content;

  // =========================
  // long memory保存
  // =========================

  fs.writeFileSync("memory/long_memory.txt", summary);

  console.log("long memory 更新");
}

module.exports = summarizeMemory;
