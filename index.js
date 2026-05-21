const fs = require("fs");

async function chat(userMessage) {

  console.log("chat開始");

  // =========================
  // 現在日時
  // =========================

  const now = new Date();

  const currentTime = now.toLocaleString(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
    }
  );

  // =========================
  // 各ファイル読み込み
  // =========================

  const profile = fs.readFileSync(
    "memory/profile.txt",
    "utf-8"
  );

  const system = fs.readFileSync(
    "memory/system.txt",
    "utf-8"
  );

  const aiProfile = fs.readFileSync(
    "memory/ai_profile.txt",
    "utf-8"
  );

  // =========================
  // 感情状態読み込み
  // =========================

  const moodData = JSON.parse(
    fs.readFileSync(
      "memory/mood.json",
      "utf-8"
    )
  );

  // =========================
  // 時間経過による回復
  // =========================

  const lastTalkTime = new Date(
    moodData.lastTalkTime
  );

  const diffMs =
    now - lastTalkTime;

  const diffHours =
    diffMs /
    (1000 * 60 * 60);

  // 1時間ごとに5回復
  moodData.energy += Math.floor(
    diffHours * 5
  );

  // =========================
  // energy範囲制限
  // =========================

  if (moodData.energy > 100) {
    moodData.energy = 100;
  }

  if (moodData.energy < 0) {
    moodData.energy = 0;
  }

  // =========================
  // 時間帯による雰囲気
  // =========================

  const hour = now.getHours();

  if (hour >= 0 && hour <= 4) {

    moodData.atmosphere =
      "深夜の静かな空気";

  }
  else if (hour <= 10) {

    moodData.atmosphere =
      "朝の静かな空気";

  }
  else if (hour <= 17) {

    moodData.atmosphere =
      "昼の穏やかな空気";

  }
  else {

    moodData.atmosphere =
      "夕方から夜の空気";
  }

  // =========================
  // energyによる感情
  // =========================

  if (moodData.energy <= 30) {

    moodData.mood =
      "少し疲れてる";

  }
  else if (
    moodData.energy >= 80
  ) {

    moodData.mood =
      "元気";

  }
  else {

    moodData.mood =
      "落ち着いている";
  }

  // =========================
  // 長期記憶
  // =========================

  let longMemory = "";

  if (
    fs.existsSync(
      "memory/long_memory.txt"
    )
  ) {

    longMemory =
      fs.readFileSync(
        "memory/long_memory.txt",
        "utf-8"
      );
  }

  // =========================
  // 会話履歴
  // =========================

  let chatHistory = "";

  if (
    fs.existsSync(
      "memory/chat_history.txt"
    )
  ) {

    chatHistory =
      fs.readFileSync(
        "memory/chat_history.txt",
        "utf-8"
      );

    // 最近の会話だけ使う
    const lines =
      chatHistory.split("\n");

    chatHistory =
      lines
        .slice(-10)
        .join("\n");
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
【宵月 灯の現在状態】に記載の現在の感情状態、体力、現在の雰囲気は、過去の会話履歴より優先してください。

過去の会話に宵月 灯の感情状態、体力、雰囲気があっても、
【宵月 灯の現在状態】を優先してください。
`;

  // =========================
  // メインAIへ送信
  // =========================

  console.log("メインAI送信");

  const response = await fetch(
    "http://127.0.0.1:11434/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        model:
          "qwen2.5:1.5b",
        stream: false,
        think: false,

        messages: [
          {
            role: "system",
            content:
              systemPrompt,
          },
          {
            role: "user",
            content:
              "/no_think\n" + userMessage,
          },
        ],
      }),
    }
  );

  console.log("メインAI受信");

  const data =
    await response.json();

  console.log(data);

  const aiMessage =
    data.message.content;

  // =========================
  // 会話による疲労
  // =========================

  moodData.energy -= 3;

  // =========================
  // energy範囲制限
  // =========================

  if (moodData.energy > 100) {
    moodData.energy = 100;
  }

  if (moodData.energy < 0) {
    moodData.energy = 0;
  }

  // =========================
  // AI返答要約
  // =========================

  const summaryPrompt = `
次の返答内容を、
短く客観的に要約してください。

感情的・詩的な表現は禁止です。

20文字以内で要約してください。

返答:
${aiMessage}
`;

  console.log("要約AI送信");

  const summaryResponse =
    await fetch(
      "http://127.0.0.1:11434/api/chat",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          model:
            "qwen2.5:1.5b",
          stream: false,
          think: false,

          messages: [
            {
              role: "system",
              content:
                "あなたは会話要約AIです。",
            },
            {
              role: "user",
              content:
                summaryPrompt,
            },
          ],
        }),
      }
    );

  console.log("要約AI受信");

  const summaryData =
    await summaryResponse.json();

  console.log(summaryData);

  const shortAiMessage =
    summaryData.message.content;

  // =========================
  // 会話ログ保存
  // =========================

  const log = `
【日時】
${currentTime}

【ガルパチの発言】
${userMessage}

【宵月 灯の発言要約】
${shortAiMessage}

`;

  fs.appendFileSync(
    "memory/chat_history.txt",
    log
  );

  // =========================
  // 最終会話時間更新
  // =========================

  moodData.lastTalkTime =
    now.toISOString();

  // =========================
  // mood保存
  // =========================

  fs.writeFileSync(
    "memory/mood.json",

    JSON.stringify(
      moodData,
      null,
      2
    )
  );

  // =========================
  // 長期記憶更新
  // =========================

  require("./summarize");

  console.log("chat終了");

  return aiMessage;
}

module.exports = chat;