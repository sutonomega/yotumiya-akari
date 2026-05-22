const fs = require("fs");

// =========================
// 会話履歴保存
// =========================

function saveHistory({
  settings,

  mode,

  userMessage,

  aiMessage,
}) {
  // =========================
  // 通常会話のみ保存
  // =========================

  if (mode !== "reply") {
    return;
  }

  // =========================
  // 履歴生成
  // =========================

  const historyLog = `
${settings.userName}:
${userMessage}

${settings.aiName}:
${aiMessage}

`;

  // =========================
  // 保存
  // =========================

  fs.appendFileSync(
    "memory/chat_history.txt",

    historyLog,
  );

  return historyLog;
}

module.exports = saveHistory;
