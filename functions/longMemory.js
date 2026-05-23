const fs = require("fs");

const settings = JSON.parse(fs.readFileSync("config/settings.json", "utf-8"));

// =========================
// 類似記憶判定
// =========================

function isSimilarMemory(line, existingLines) {
  // =========================
  // 単語分割
  // =========================

  const words = line.replace("- ", "").split(/[ 　]/).filter(Boolean);

  if (words.length === 0) {
    return false;
  }

  // =========================
  // 既存比較
  // =========================

  for (const existing of existingLines) {
    let hit = 0;

    for (const word of words) {
      if (existing.includes(word)) {
        hit++;
      }
    }

    // =========================
    // 類似率70%以上
    // =========================

    const similarity = hit / words.length;

    if (similarity >= 0.7) {
      return true;
    }
  }

  return false;
}

// =========================
// 長期記憶生成
// =========================

async function generateLongMemory(summaryText) {
  try {
    const promptTemplate = fs.readFileSync(
      "prompts/memory_summary.txt",
      "utf-8",
    );

    const prompt = promptTemplate.replace("{{CHAT_TEXT}}", summaryText);

    const response = await fetch(
      "http://localhost:11434/api/generate",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: settings.memoryModel,

          prompt,

          stream: false,
        }),
      },
    );

    const data = await response.json();

    let memoryText = data?.response?.trim() || "";

    // =========================
    // think除去
    // =========================

    memoryText = memoryText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    console.log("[LONG MEMORY]", memoryText);

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
    // NGワード
    // =========================

    const bannedWords = ["静かな夜", "雨の音", "心が落ち着く", "静かな時間"];

    // =========================
    // 正規化
    // =========================

    const cleaned = [];

    const seen = new Set();

    for (let line of lines) {
      line = line.trim();

      // =========================
      // 空行
      // =========================

      if (!line) {
        continue;
      }

      // =========================
      // 「- 」以外除外
      // =========================

      if (!line.startsWith("- ")) {
        continue;
      }

      // =========================
      // 長すぎる行除外
      // =========================

      if (line.length > 120) {
        continue;
      }

      // =========================
      // 「なし」除外
      // =========================

      if (line === "なし" || line === "- なし") {
        continue;
      }

      // =========================
      // NGワード多用除外
      // =========================

      let skip = false;

      for (const word of bannedWords) {
        const count = (line.match(new RegExp(word, "g")) || []).length;

        if (count >= 2) {
          skip = true;

          break;
        }
      }

      if (skip) {
        continue;
      }

      // =========================
      // 完全重複除外
      // =========================

      if (seen.has(line)) {
        continue;
      }

      // =========================
      // 類似記憶除外
      // =========================

      if (isSimilarMemory(line, cleaned)) {
        continue;
      }

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
// 保存
// =========================

async function saveLongMemory(memoryText) {
  const normalized = memoryText.replace(/^- /, "").trim();

  // =========================
  // 保存不要
  // =========================

  if (!normalized || normalized === "なし") {
    return;
  }

  // =========================
  // append
  // =========================

  fs.appendFileSync(
    "memory/long_memory.txt",

    memoryText + "\n",
  );

  // =========================
  // 正規化
  // =========================

  normalizeLongMemory();
}

module.exports = {
  generateLongMemory,

  saveLongMemory,

  normalizeLongMemory,
};
