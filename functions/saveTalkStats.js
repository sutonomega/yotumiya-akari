const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

// =========================
// 会話統計保存
// =========================

function saveTalkStats(talkStats) {
  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "talk_stats.json"),

    JSON.stringify(talkStats, null, 2),
  );
}

module.exports = saveTalkStats;
