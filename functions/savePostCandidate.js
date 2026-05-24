const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

// =========================
// 投稿候補保存
// =========================

function savePostCandidate(message) {
  const timestamp = new Date().toLocaleString("ja-JP");

  fs.appendFileSync(
    path.join(process.cwd(), settings.memoryDir, "post_candidates.txt"),

    `[${timestamp}]\n${message}\n\n`,
  );
}

module.exports = savePostCandidate;
