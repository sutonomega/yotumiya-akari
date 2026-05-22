const log = require("./logger");

const generateMessage = require("./functions/generateMessage");

const getCurrentState = require("./functions/getCurrentState");

const updateTalkStats = require("./functions/updateTalkStats");

const updateMood = require("./functions/updateMood");

const processHistory = require("./functions/processHistory");

const saveMood = require("./functions/saveMood");

const saveTalkStats = require("./functions/saveTalkStats");

const savePostCandidate = require("./functions/savePostCandidate");

// =========================
// chat
// =========================

async function chat({
  mode = "reply",

  userMessage = "",
}) {
  log("INFO", "chat開始");

  // =========================
  // 現在状態取得
  // =========================

  const state = getCurrentState();

  const {
    settings,

    now,

    hour,

    moodData,

    talkStats,

    diffHours,
  } = state;

  // =========================
  // 会話統計更新
  // =========================

  updateTalkStats({
    talkStats,

    now,

    mode,
  });

  // =========================
  // mood更新
  // =========================

  updateMood({
    moodData,

    settings,

    hour,

    diffHours,

    mode,
  });

  // =========================
  // AI応答生成
  // =========================

  log("INFO", "メッセージ生成開始");

  const aiMessage = await generateMessage({
    mode,

    userMessage,
  });

  log("INFO", "メッセージ生成完了");

  // =========================
  // 履歴処理
  // =========================

  await processHistory({
    settings,

    mode,

    userMessage,

    aiMessage,
  });

  // =========================
  // 定時つぶやき保存
  // =========================

  if (mode === "post") {
    savePostCandidate(aiMessage);
  }

  // =========================
  // mood保存
  // =========================

  moodData.lastTalkTime = now.toISOString();

  saveMood(moodData);

  // =========================
  // 会話統計保存
  // =========================

  saveTalkStats(talkStats);

  log("INFO", "chat終了");

  return aiMessage;
}

module.exports = chat;
