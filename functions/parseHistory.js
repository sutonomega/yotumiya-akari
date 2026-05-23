console.log("PROCESS HISTORY START");

const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json", "utf-8"),
  ),
);

// =========================
// 履歴解析
// =========================

function parseHistory() {
  try {
    // =========================
    // file存在確認
    // =========================

    if (
      !fs.existsSync(
        path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),
      )
    ) {
      return "";
    }

    // =========================
    // 読み込み
    // =========================

    const lines = fs
      .readFileSync(
        path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),
        "utf-8",
      )
      .split("\n");

    // =========================
    // NGワード
    // =========================

    const overusedWords = ["静かな夜", "雨の音", "心が落ち着く", "静かな時間"];

    // =========================
    // フィルタ後履歴
    // =========================

    const filtered = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // =========================
      // 空行除外
      // =========================

      if (!line) {
        continue;
      }

      // =========================
      // AI発言判定
      // =========================

      const isAIMessage = line.startsWith(`${settings.aiName}:`);

      // =========================
      // 定型文除外
      // =========================

      if (isAIMessage) {
        let skip = false;

        // 短すぎる定型文
        if (line.length < 25) {
          skip = true;
        }

        // NGワード多用
        for (const word of overusedWords) {
          const count = (line.match(new RegExp(word, "g")) || []).length;

          if (count >= 1) {
            skip = true;

            break;
          }
        }

        if (skip) {
          continue;
        }
      }

      filtered.push(line);
    }

    // =========================
    // 最新履歴取得
    // =========================

    const recentLines = filtered.slice(-settings.recentChatLines);

    // =========================
    // join
    // =========================

    return recentLines.join("\n");
  } catch (error) {
    console.log("[PARSE HISTORY ERROR]", error);

    return "";
  }
}

module.exports = parseHistory;
