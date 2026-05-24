const fs = require("fs");

const path = require("path");

const generateMessage = require("./functions/generateMessage");

const processHistory = require("./functions/processHistory");

const speak = require("./functions/speak");

const log = require("./logger");

// =========================
// chat
// =========================

async function chat({
  settings,

  mode = "reply",

  userMessage = "",
}) {
  try {
    log("INFO", "chat開始");

    // =========================
    // メッセージ生成
    // =========================

    log("INFO", "メッセージ生成開始");

    const message = await generateMessage({
      settings,

      mode,

      userMessage,
    });

    log("INFO", "メッセージ生成完了");

    // =========================
    // 音声生成
    // =========================

    await speak(message);

    // =========================
    // 履歴処理
    // =========================
    console.log("PROCESS HISTORY CALL");
    processHistory({
      settings,

      mode,

      userMessage,

      aiMessage: message,
    }).catch(console.error);

    log("INFO", "chat終了");

    // =========================
    // return
    // =========================

    return message;
  } catch (error) {
    console.log("[CHAT ERROR]", error);

    log("ERROR", error.toString());

    return settings.defaultMessage;
  }
}

module.exports = chat;
