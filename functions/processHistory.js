const log = require("./logger");

const saveHistory = require("./saveHistory");

const generateSummary = require("./summary");

const {
  generateLongMemory,

  saveLongMemory,
} = require("./longMemory");

const compressHistory = require("./compressHistory");

// =========================
// 履歴処理
// =========================

async function processHistory({
  settings,

  mode,

  userMessage,

  aiMessage,
}) {
  console.log("PROCESS HISTORY START");

  // =========================
  // 履歴保存
  // =========================

  const historyLog = saveHistory({
    settings,

    mode,

    userMessage,

    aiMessage,
  });

  // =========================
  // 保存なし
  // =========================

  if (!historyLog) {
    return;
  }

  try {
    // =========================
    // summary生成
    // =========================

    console.log("SUMMARY START");

    const summary = await generateSummary(settings, historyLog);

    console.log("[SUMMARY RESULT]", summary);

    console.log("SUMMARY END");

    // =========================
    // 長期記憶生成
    // =========================

    console.log("LONG MEMORY START");

    const memory = await generateLongMemory(settings, summary);

    console.log("[LONG MEMORY RESULT]", memory);

    // =========================
    // 保存
    // =========================

    await saveLongMemory(settings, memory);

    console.log("LONG MEMORY END");

    // =========================
    // chat_history圧縮
    // =========================

    await compressHistory(settings);
  } catch (error) {
    console.log("PROCESS HISTORY ERROR", error);

    log("ERROR", error.toString());
  }
}

module.exports = processHistory;
