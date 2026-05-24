const fs = require("fs");

const path = require("path");

// =========================
// mood保存
// =========================

function saveMood(settings, moodData) {
  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "mood.json"),

    JSON.stringify(moodData, null, 2),
  );
}

module.exports = saveMood;
