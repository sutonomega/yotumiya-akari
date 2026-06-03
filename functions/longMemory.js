const fs = require("fs");

const path = require("path");

const { createLlmProvider } = require("./llmProvider");

const DEFAULT_SAFETY_CONFIG = Object.freeze({
  bannedWords: [],
  bannedWordRepeatLimit: 2,
});

let cachedSafetyConfig = null;

function readLongMemorySafetyConfig() {
  const filePath = path.join(process.cwd(), "config", "long_memory_safety.json");

  if (!fs.existsSync(filePath)) {
    return DEFAULT_SAFETY_CONFIG;
  }

  return {
    ...DEFAULT_SAFETY_CONFIG,
    ...JSON.parse(fs.readFileSync(filePath, "utf-8")),
  };
}

function loadLongMemorySafetyConfig() {
  if (!cachedSafetyConfig) {
    cachedSafetyConfig = readLongMemorySafetyConfig();
  }

  return cachedSafetyConfig;
}

function reloadLongMemorySafetyConfig() {
  cachedSafetyConfig = readLongMemorySafetyConfig();
  return cachedSafetyConfig;
}

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

async function generateLongMemory(settings, summaryText) {
  try {
    const promptTemplate = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "memory_summary.txt"),
      "utf-8",
    );

    const prompt = promptTemplate.replace("{{CHAT_TEXT}}", summaryText);

    const provider = createLlmProvider(settings);
    const memoryText = await provider.generate(prompt, {
      model: settings.memoryModel,
    });

    /*
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
    */

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

function normalizeLongMemory(settings) {
  try {
    // =========================
    // file存在確認
    // =========================

    if (
      !fs.existsSync(
        path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),
      )
    ) {
      return;
    }

    // =========================
    // 読み込み
    // =========================

    const lines = fs
      .readFileSync(
        path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),
        "utf-8",
      )
      .split("\n");

    // =========================
    // NGワード
    // =========================

    const safetyConfig = loadLongMemorySafetyConfig();
    const bannedWords = safetyConfig.bannedWords || [];

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

        if (count >= safetyConfig.bannedWordRepeatLimit) {
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
      path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),

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

async function saveLongMemory(settings, memoryText) {
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
    path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),

    memoryText + "\n",
  );

  // =========================
  // 正規化
  // =========================

  normalizeLongMemory(settings);
}

module.exports = {
  generateLongMemory,

  loadLongMemorySafetyConfig,

  reloadLongMemorySafetyConfig,

  saveLongMemory,

  normalizeLongMemory,
};
