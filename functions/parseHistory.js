const fs = require("fs");

const path = require("path");

// =========================
// parseHistory
// =========================

function parseHistory(
  settings,

  historyText,
) {
  try {
    // =========================
    // lines
    // =========================

    const lines = historyText.split("\n");

    // =========================
    // NGワード
    // =========================

    const overusedWords = ["静かな夜", "雨の音", "心が落ち着く", "静かな時間"];

    // =========================
    // messages
    // =========================

    const messages = [];

    // =========================
    // parse
    // =========================

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // =========================
      // empty
      // =========================

      if (!line) {
        continue;
      }

      // =========================
      // user
      // =========================

      if (line.startsWith(`${settings.userName}:`)) {
        messages.push({
          role: "user",

          content: line.replace(`${settings.userName}:`, "").trim(),
        });

        continue;
      }

      // =========================
      // assistant
      // =========================

      if (line.startsWith(`${settings.aiName}:`)) {
        const content = line.replace(`${settings.aiName}:`, "").trim();

        // =========================
        // short filter
        // =========================

        if (content.length < 25) {
          continue;
        }

        // =========================
        // NG word filter
        // =========================

        let skip = false;

        for (const word of overusedWords) {
          if (content.includes(word)) {
            skip = true;

            break;
          }
        }

        if (skip) {
          continue;
        }

        messages.push({
          role: "assistant",

          content,
        });
      }
    }

    // =========================
    // recent
    // =========================

    return messages.slice(-settings.recentChatLines);
  } catch (error) {
    console.log("[PARSE HISTORY ERROR]", error);

    return [];
  }
}

module.exports = parseHistory;
