const fs = require("fs");

// =========================
// mood保存
// =========================

function saveMood(moodData) {
  fs.writeFileSync(
    "memory/mood.json",

    JSON.stringify(moodData, null, 2),
  );
}

module.exports = saveMood;
