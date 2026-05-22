const fs = require("fs");

// =========================
// 投稿候補保存
// =========================

function savePostCandidate(message) {
  const timestamp = new Date().toLocaleString("ja-JP");

  fs.appendFileSync(
    "memory/post_candidates.txt",

    `[${timestamp}]\n${message}\n\n`,
  );
}

module.exports = savePostCandidate;
