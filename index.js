const fs = require("fs");

const log = require("./logger");

async function chat(userMessage) {
  log("INFO", "chat開始");

  // =========================
  // 設定読み込み
  // =========================

  const settings = JSON.parse(fs.readFileSync("config/settings.json", "utf-8"));

  // =========================
  // 現在日時
  // =========================

  const now = new Date();

  const currentTime = now.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });

  // =========================
  // 各ファイル読み込み
  // =========================

  const profile = fs.readFileSync("memory/profile.txt", "utf-8");

  const system = fs.readFileSync("prompts/system.txt", "utf-8");

  const aiProfile = fs.readFileSync("memory/ai_profile.txt", "utf-8");

  // =========================
  // summary prompt
  // =========================

  const summaryBasePrompt = fs.readFileSync("prompts/summary.txt", "utf-8");

  // =========================
  // 感情状態読み込み
  // =========================

  const moodData = JSON.parse(fs.readFileSync("memory/mood.json", "utf-8"));

  // =========================
  // 時間経過による回復
  // =========================

  const lastTalkTime = new Date(moodData.lastTalkTime);

  const diffMs = now - lastTalkTime;

  const diffHours = diffMs / (1000 * 60 * 60);

  moodData.energy += Math.floor(diffHours * settings.energyRecoveryPerHour);

  // =========================
  // energy範囲制限
  // =========================

  if (moodData.energy > settings.maxEnergy) {
    moodData.energy = settings.maxEnergy;
  }

  if (moodData.energy < 0) {
    moodData.energy = 0;
  }

  // =========================
  // 時間帯による雰囲気
  // =========================

  const hour = now.getHours();

  if (hour >= 0 && hour <= 4) {
    moodData.atmosphere = "深夜の静かな空気";
  } else if (hour <= 10) {
    moodData.atmosphere = "朝の静かな空気";
  } else if (hour <= 17) {
    moodData.atmosphere = "昼の穏やかな空気";
  } else {
    moodData.atmosphere = "夕方から夜の空気";
  }

  // =========================
  // energyによる感情
  // =========================

  if (moodData.energy <= 30) {
    moodData.mood = "少し疲れてる";
  } else if (moodData.energy >= 80) {
    moodData.mood = "元気";
  } else {
    moodData.mood = "落ち着いている";
  }

  // =========================
  // 長期記憶
  // =========================

  let longMemory = "";

  if (fs.existsSync("memory/long_memory.txt")) {
    longMemory = fs.readFileSync("memory/long_memory.txt", "utf-8");
  }

  // =========================
  // 会話履歴
  // =========================

  let chatHistory = "";

  if (fs.existsSync("memory/chat_history.txt")) {
    chatHistory = fs.readFileSync("memory/chat_history.txt", "utf-8");

    const lines = chatHistory.split("\n");

    chatHistory = lines.slice(-settings.recentChatLines).join("\n");
  }

  // =========================
  // System Prompt
  // =========================

  const systemPrompt = `
${system}

【宵月 灯のプロフィール】
${aiProfile}

【ガルパチのプロフィール】
${profile}

【長期記憶】
${longMemory}

【最近の会話】
${chatHistory}

【現在日時】
${currentTime}

【宵月 灯の現在状態】
- 感情状態:
${moodData.mood}

- 体力:
${moodData.energy}/100

- 現在の雰囲気:
${moodData.atmosphere}

重要：
【宵月 灯の現在状態】に記載の現在の感情状態、体力、雰囲気は、
過去の会話履歴より優先してください。
`;

  // =========================
  // メインAI
  // =========================

  log("INFO", "メインAI送信");

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
          content: systemPrompt,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    }),
  });

  log("INFO", "メインAI受信");

  const data = await response.json();

  const aiMessage = data.message.content;

  // =========================
  // 疲労
  // =========================

  moodData.energy -= settings.energyDecrease;

  if (moodData.energy > settings.maxEnergy) {
    moodData.energy = settings.maxEnergy;
  }

  if (moodData.energy < 0) {
    moodData.energy = 0;
  }

  // =========================
  // 要約AI
  // =========================

  const summaryPrompt = `
${summaryBasePrompt}

返答:
${aiMessage}
`;

  log("INFO", "要約AI送信");

  const summaryResponse = await fetch("http://127.0.0.1:11434/api/chat", {
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
          content: "あなたは会話要約AIです。",
        },
        {
          role: "user",
          content: summaryPrompt,
        },
      ],
    }),
  });

  log("INFO", "要約AI受信");

  const summaryData = await summaryResponse.json();

  const shortAiMessage = summaryData.message.content;

  // =========================
  // ログ保存
  // =========================

  const historyLog = `
【日時】
${currentTime}

【ガルパチの発言】
${userMessage}

【宵月 灯の発言要約】
${shortAiMessage}

`;

  fs.appendFileSync("memory/chat_history.txt", historyLog);

  // =========================
  // mood保存
  // =========================

  moodData.lastTalkTime = now.toISOString();

  fs.writeFileSync(
    "memory/mood.json",

    JSON.stringify(moodData, null, 2),
  );

  // =========================
  // 長期記憶更新
  // =========================

  const summarizeMemory = require("./summarize");

  summarizeMemory();

  log("INFO", "chat終了");

  return aiMessage;
}

module.exports = chat;
