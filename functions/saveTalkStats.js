const fs = require("fs");

// =========================
// 会話統計保存
// =========================

function saveTalkStats(talkStats) {
  fs.writeFileSync(
    "memory/talk_stats.json",

    JSON.stringify(talkStats, null, 2),
  );
}

module.exports = saveTalkStats;
