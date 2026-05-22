const log = require("../logger");

const saveHistory = require("./saveHistory");

const processLongMemory = require("./summarize");

// =========================
// 履歴処理
// =========================

async function processHistory({
  settings,

  mode,

  userMessage,

  aiMessage,
}) {
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

  // =========================
  // 長期記憶処理
  // =========================

  try {
    console.log("LONG MEMORY START");

    await processLongMemory(historyLog);

    console.log("LONG MEMORY END");
  } catch (error) {
    console.log("LONG MEMORY ERROR", error);

    log("ERROR", error.toString());
  }
}

module.exports = processHistory;
