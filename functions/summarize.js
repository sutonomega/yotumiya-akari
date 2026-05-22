const fs = require("fs");

// =========================
// settings読み込み
// =========================

const settings = JSON.parse(fs.readFileSync("config/settings.json", "utf-8"));

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
        model: settings.memoryModel,

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
    console.log("[LONG MEMORY ERROR]", error);

    return "なし";
  }
}

// =========================
// 長期記憶正規化
// =========================

function normalizeLongMemory() {
  try {
    // =========================
    // file存在確認
    // =========================

    if (!fs.existsSync("memory/long_memory.txt")) {
      return;
    }

    // =========================
    // 読み込み
    // =========================

    const lines = fs
      .readFileSync("memory/long_memory.txt", "utf-8")
      .split("\n");

    // =========================
    // 禁止ワード
    // =========================

    const bannedWords = [
      "具体的な長期記憶情報はない",
      "雑談",
      "保存不要",
      "話者",
      "記憶整理",
    ];

    // =========================
    // 正規化
    // =========================

    const cleaned = [];

    const seen = new Set();

    for (let line of lines) {
      line = line.trim();

      // 空行
      if (!line) {
        continue;
      }

      // 「- 」以外除外
      if (!line.startsWith("- ")) {
        continue;
      }

      // 長すぎる行除外
      if (line.length > 100) {
        continue;
      }

      // 禁止ワード
      let skip = false;

      for (const word of bannedWords) {
        if (line.includes(word)) {
          skip = true;

          break;
        }
      }

      if (skip) {
        continue;
      }

      // 重複
      if (seen.has(line)) {
        continue;
      }

      // 保存
      seen.add(line);

      cleaned.push(line);
    }

    // =========================
    // 最新100件だけ
    // =========================

    const trimmed = cleaned.slice(-100);

    // =========================
    // 書き戻し
    // =========================

    fs.writeFileSync(
      "memory/long_memory.txt",

      trimmed.join("\n") + "\n",
    );

    console.log("[MEMORY NORMALIZED]");
  } catch (error) {
    console.log("[MEMORY NORMALIZE ERROR]", error);
  }
}

// =========================
// 長期記憶保存
// =========================

async function saveLongMemory(memoryText) {
  // =========================
  // 空だけ除外
  // =========================

  if (memoryText.length === 0) {
    return;
  }

  // =========================
  // append
  // =========================

  fs.appendFileSync(
    "memory/long_memory.txt",

    "\n" + memoryText + "\n",
  );

  // =========================
  // 正規化
  // =========================

  normalizeLongMemory();
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
