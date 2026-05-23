const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

const generateSummary = require("./summary");

// =========================
// chat_history圧縮
// =========================

async function compressHistory() {
  try {
    // =========================
    // file確認
    // =========================

    if (
      !fs.existsSync(
        path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),
      )
    ) {
      return;
    }

    // =========================
    // 履歴取得
    // =========================

    const lines = fs
      .readFileSync(
        path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),
        "utf-8",
      )
      .split("\n");

    // =========================
    // 行数不足
    // =========================

    if (lines.length < 200) {
      return;
    }

    console.log("[COMPRESS] START");

    // =========================
    // 古い履歴切り出し
    // =========================

    const oldLines = lines.slice(0, 100);

    const remainLines = lines.slice(100);

    const oldText = oldLines.join("\n");

    // =========================
    // summary生成
    // =========================

    const summary = await generateSummary(oldText);

    console.log("[COMPRESS SUMMARY]", summary);

    // =========================
    // summary保存
    // =========================

    fs.appendFileSync(
      path.join(
        process.cwd(),
        settings.memoryDir,
        "memory_summary_history.txt",
      ),

      summary + "\n",
    );

    // =========================
    // chat_history更新
    // =========================

    fs.writeFileSync(
      path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),

      remainLines.join("\n"),
    );

    console.log("[COMPRESS] END");
  } catch (error) {
    console.log("[COMPRESS ERROR]", error);
  }
}

module.exports = compressHistory;
