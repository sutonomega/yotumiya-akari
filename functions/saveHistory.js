const { appendMemoryText } = require("./stateStore");

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

  const historyLog =
    `${settings.userName}:\n` +
    `${userMessage}\n\n` +
    `${settings.aiName}:\n` +
    `${aiMessage}\n\n`;

  // =========================
  // 保存
  // =========================

  appendMemoryText("chat_history.txt", historyLog, settings);

  return historyLog;
}

module.exports = saveHistory;
