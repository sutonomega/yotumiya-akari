const fs = require("fs");

const path = require("path");

// =========================
// json読み込み
// =========================

function loadJson(path, defaultValue = {}) {
  try {
    // =========================
    // 存在確認
    // =========================

    if (!fs.existsSync(path)) {
      return defaultValue;
    }

    // =========================
    // json読み込み
    // =========================

    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch (error) {
    console.log("[LOAD JSON ERROR]", path, error);

    return defaultValue;
  }
}

module.exports = loadJson;
