const fs = require("fs");

const cron = require("node-cron");

const log = require("./logger");

const CHANNEL_ID = "1506657409622610083";

// =========================
// AIメッセージ生成
// =========================

async function generateAutoMessage() {
  try {
    const now = new Date();

    const hour = now.getHours();

    let timeText = "夜";

    // =========================
    // 時間帯判定
    // =========================

    if (hour >= 5 && hour < 11) {
      timeText = "朝";
    } else if (hour >= 11 && hour < 18) {
      timeText = "昼";
    } else if (hour >= 18 && hour < 22) {
      timeText = "夕方";
    } else {
      timeText = "夜";
    }

    // =========================
    // prompt
    // =========================

    const prompt = `
あなたは夜宮 灯（よるみや あかり）。

現在は「${timeText}」です。

その時間帯に合った、
静かな日常の独り言を1つ生成してください。

条件:
- 日本語のみ
- 英語禁止
- ハッシュタグ禁止
- 1〜2文
- 40文字前後
- 落ち着いた雰囲気
- 自然な独り言
- 日常の空気感
- 詩的すぎない
- 質問しない
- 説明しない
- ガルパチへの呼びかけ禁止
- 思考過程を出力しない
`;

    const response = await fetch(
      "http://localhost:11434/api/generate",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: "qwen2.5:3b",

          prompt,

          stream: false,
        }),
      },
    );

    const data = await response.json();

    let message = data.response.trim();

    // =========================
    // think除去
    // =========================

    message = message.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return message;
  } catch (error) {
    log("ERROR", error.toString());

    return "静かな時間です。";
  }
}

// =========================
// 投稿候補保存
// =========================

function savePostCandidate(message) {
  const timestamp = new Date().toLocaleString("ja-JP");

  fs.appendFileSync(
    "memory/post_candidates.txt",

    `[${timestamp}]\n${message}\n\n`,
  );
}

// =========================
// Discord送信
// =========================

async function sendAutoMessage(client, message) {
  const channel = await client.channels.fetch(CHANNEL_ID);

  await channel.send(message);

  savePostCandidate(message);
}

// =========================
// Scheduler開始
// =========================

function startScheduler(client) {
  // ========================================
  // 会話停止時の自発発言
  // ========================================

  cron.schedule("* * * * *", async () => {
    log("SYSTEM", "定期チェック");

    // =========================
    // mood読み込み
    // =========================

    const moodData = JSON.parse(fs.readFileSync("memory/mood.json", "utf-8"));

    // =========================
    // scheduler状態読み込み
    // =========================

    let schedulerData = {
      lastAutoMessage: null,
    };

    if (fs.existsSync("memory/scheduler.json")) {
      schedulerData = JSON.parse(
        fs.readFileSync("memory/scheduler.json", "utf-8"),
      );
    }

    // =========================
    // 最終会話時間
    // =========================

    const now = new Date();

    const lastTalkTime = new Date(moodData.lastTalkTime);

    const diffMs = now - lastTalkTime;

    const diffHours = diffMs / (1000 * 60 * 60);

    // =========================
    // 最終自発発言時間
    // =========================

    let autoDiffHours = 999;

    if (schedulerData.lastAutoMessage) {
      const lastAuto = new Date(schedulerData.lastAutoMessage);

      autoDiffHours = (now - lastAuto) / (1000 * 60 * 60);
    }

    // =========================
    // 自発発言条件
    // =========================

    if (diffHours >= 1 && autoDiffHours >= 6) {
      log("SYSTEM", "自発発言送信");

      const autoMessage = await generateAutoMessage();

      await sendAutoMessage(client, autoMessage);

      // =========================
      // 自発発言時間保存
      // =========================

      schedulerData.lastAutoMessage = now.toISOString();

      fs.writeFileSync(
        "memory/scheduler.json",

        JSON.stringify(schedulerData, null, 2),
      );
    }
  });

  // ========================================
  // 定時つぶやき
  // ========================================

  cron.schedule("0 7,12,18,23 * * *", async () => {
    log("SYSTEM", "定時つぶやき");

    const autoMessage = await generateAutoMessage();

    await sendAutoMessage(client, autoMessage);
  });
}

module.exports = startScheduler;
