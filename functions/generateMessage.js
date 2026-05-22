const fs = require("fs");

// =========================
// settings読み込み
// =========================

const settings = JSON.parse(fs.readFileSync("config/settings.json", "utf-8"));

// =========================
// chat_history parse
// =========================

function parseHistory(historyText) {
  const lines = historyText.split("\n");

  const messages = [];

  for (const line of lines) {
    // user
    if (line.startsWith(`${settings.userName}:`)) {
      messages.push({
        role: "user",

        content: line.replace(`${settings.userName}:`, "").trim(),
      });
    }

    // assistant
    else if (line.startsWith("夜宮 灯:")) {
      messages.push({
        role: "assistant",

        content: line.replace("夜宮 灯:", "").trim(),
      });
    }
  }

  return messages;
}

// =========================
// generateMessage
// =========================

async function generateMessage({
  mode = "reply",

  userMessage = "",
}) {
  try {
    // =========================
    // profile読み込み
    // =========================

    const aiProfile = fs.readFileSync("memory/ai_profile.txt", "utf-8");

    const userProfile = fs.readFileSync("memory/user_profile.txt", "utf-8");

    const conversationRules = fs.readFileSync(
      "memory/conversation_rules.txt",
      "utf-8",
    );

    const longMemory = fs.readFileSync("memory/long_memory.txt", "utf-8");

    const chatHistory = fs.readFileSync("memory/chat_history.txt", "utf-8");

    // =========================
    // 最新履歴
    // =========================

    const recentHistory = chatHistory
      .trim()
      .split("\n")
      .slice(-settings.recentChatLines)
      .join("\n");

    // =========================
    // history parse
    // =========================

    const historyMessages = parseHistory(recentHistory);

    // =========================
    // mode別指示
    // =========================

    let modePrompt = "";

    // self talk
    if (mode === "self_talk") {
      modePrompt = `
自然に話しかけてください。

条件:
- 静かな呼びかけ
- 雑談
- 独り言寄りでもよい
- 質問攻め禁止
`;
    }

    // post
    else if (mode === "post") {
      modePrompt = `
時間帯に合った、
静かな日常のつぶやきを
生成してください。

条件:
- 1〜2文
- 40文字前後
- 落ち着いた雰囲気
- 日常の空気感
- 詩的すぎない
- 質問しない
- ${settings.userName}への呼びかけ禁止
`;
    }

    // =========================
    // system prompt
    // =========================

    const systemPrompt = `
${conversationRules}

【夜宮 灯プロフィール】
${aiProfile}

【${settings.userName}プロフィール】
${userProfile}

【長期記憶】
${longMemory}
`;

    // =========================
    // messages
    // =========================

    const messages = [
      {
        role: "system",

        content: systemPrompt,
      },

      ...historyMessages,
    ];

    // =========================
    // reply
    // =========================

    if (mode === "reply") {
      messages.push({
        role: "user",

        content: userMessage,
      });
    }

    // =========================
    // self talk / post
    // =========================
    else {
      messages.push({
        role: "user",

        content: modePrompt,
      });
    }

    // =========================
    // AI送信
    // =========================

    const response = await fetch(
      "http://localhost:11434/api/chat",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: settings.chatModel,

          messages,

          stream: false,

          options: {
            temperature: 0.6,
          },
        }),
      },
    );

    const data = await response.json();

    let message = data.message.content.trim();

    // =========================
    // think除去
    // =========================

    message = message.replace(
      /<think>[\s\S]*?<\/think>/g,

      "",
    );

    message = message.trim();

    // =========================
    // mode別装飾
    // =========================

    if (mode === "post") {
      message = `【定時つぶやき】\n${message}`;
    }

    // =========================
    // 長さ制限
    // =========================

    if (message.length > settings.replyMaxLength) {
      message = message.slice(0, settings.replyMaxLength);
    }

    return message;
  } catch (error) {
    console.log("[GENERATE ERROR]", error);

    return settings.defaultMessage;
  }
}

module.exports = generateMessage;
