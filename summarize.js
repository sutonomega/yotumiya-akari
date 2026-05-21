const fs = require("fs");

// =========================
// 長期記憶生成
// =========================

async function generateLongMemory(chatText) {
  try {
    const prompt = `
あなたは記録整理AIです。

以下の会話から、
あとで覚えておく価値がある内容を
1行でまとめてください。

条件:
- ユーザーが実際に話した内容だけを使う
- 会話に存在しない内容を推測しない
- 新機能追加
- 継続中の活動
- 重要な変化
は積極的に残す

雑談だけの場合のみ
「なし」
と出力してください。

条件:
- 日本語のみ
- 1行のみ
- 必ず「- 」から始める
- 短く自然にまとめる

例:

会話:
ガルパチ:
今日、定時つぶやき機能を追加した

出力:
- ガルパチは定時つぶやき機能を追加した

会話:
ガルパチ:
今日は曲を作っていた

出力:
- ガルパチはAI楽曲制作を続けている

会話:
ガルパチ:
おはよう

出力:
なし

会話:
${chatText}
`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        model: "qwen2.5:3b",

        prompt,

        stream: false,
      }),
    });

    const data = await response.json();

    let memoryText = data.response.trim();

    // =========================
    // think除去
    // =========================

    memoryText = memoryText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return memoryText;
  } catch (error) {
    console.log(error);

    return "なし";
  }
}

// =========================
// 長期記憶整理
// =========================

function cleanLongMemory() {
  try {
    if (!fs.existsSync("memory/long_memory.txt")) {
      return;
    }

    // =========================
    // 読み込み
    // =========================

    const lines = fs
      .readFileSync("memory/long_memory.txt", "utf-8")
      .split("\n")

      // 空行削除
      .filter(Boolean)

      // 「- 」のみ残す
      .filter((line) => line.startsWith("- "))

      // 長すぎる行削除
      .filter((line) => line.length < 100);

    // =========================
    // 禁止ワード
    // =========================

    const bannedWords = [
      "具体的な長期記憶情報はない",
      "雑談",
      "保存不要",
      "話者",
      "記憶整理",
      "長期記憶",
    ];

    const filteredLines = lines.filter((line) => {
      for (const word of bannedWords) {
        if (line.includes(word)) {
          return false;
        }
      }

      return true;
    });

    // =========================
    // 重複削除
    // =========================

    const uniqueLines = [...new Set(filteredLines)];

    // =========================
    // 最新100件
    // =========================

    const trimmed = uniqueLines.slice(-100);

    // =========================
    // 保存
    // =========================

    fs.writeFileSync(
      "memory/long_memory.txt",

      trimmed.join("\n") + "\n",
    );

    console.log("[MEMORY CLEANED]");
  } catch (error) {
    console.log("[MEMORY CLEAN ERROR]", error);
  }
}

// =========================
// 長期記憶保存
// =========================

async function saveLongMemory(memoryText) {
  // =========================
  // 保存不要
  // =========================

  if (memoryText === "なし" || memoryText.length === 0) {
    return;
  }

  // =========================
  // 禁止ワード
  // =========================

  const bannedWords = [
    "具体的な長期記憶情報はない",
    "雑談",
    "保存不要",
    "話者",
    "記憶整理",
    "長期記憶",
  ];

  for (const word of bannedWords) {
    if (memoryText.includes(word)) {
      console.log("[MEMORY SKIP]", memoryText);

      return;
    }
  }

  // =========================
  // 現在memory
  // =========================

  let currentMemory = "";

  if (fs.existsSync("memory/long_memory.txt")) {
    currentMemory = fs.readFileSync("memory/long_memory.txt", "utf-8");
  }

  // =========================
  // 重複防止
  // =========================

  if (currentMemory.includes(memoryText)) {
    return;
  }

  // =========================
  // 追記
  // =========================

  fs.appendFileSync(
    "memory/long_memory.txt",

    "\n" + memoryText + "\n",
  );

  // =========================
  // 整理
  // =========================

  cleanLongMemory();
}

// =========================
// 実行
// =========================

async function processLongMemory(chatText) {
  const memoryText = await generateLongMemory(chatText);

  console.log("[LONG MEMORY]", memoryText);

  await saveLongMemory(memoryText);
}

module.exports = processLongMemory;
