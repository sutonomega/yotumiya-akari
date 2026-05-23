const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

// =========================
// mood保存
// =========================

function saveMood(moodData) {
  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "mood.json"),

    JSON.stringify(moodData, null, 2),
  );
}

module.exports = saveMood;
