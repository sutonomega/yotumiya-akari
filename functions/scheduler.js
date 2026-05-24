const fs = require("fs");

const path = require("path");

const log = require("./logger");

const getCurrentState = require("./getCurrentState");

// =========================
// scheduler判定
// =========================

async function checkScheduler() {
  log("SYSTEM", "定期チェック");

  // =========================
  // 現在状態取得
  // =========================

  const {
    settings,

    now,

    hour,

    minute,

    schedulerData,
  } = getCurrentState();

  // =========================
  // 定時つぶやき判定
  // =========================

  const currentSlot = `${hour}:${minute}`;

  // 毎時00分に実行
  if (minute === 0) {
    // 同じ時間帯での重複防止
    if (schedulerData.lastPostTime !== currentSlot) {
      log("SYSTEM", "定時つぶやき要求");

      schedulerData.lastPostTime = currentSlot;

      fs.writeFileSync(
        path.join(process.cwd(), settings.memoryDir, "scheduler.json"),

        JSON.stringify(schedulerData, null, 2),
      );

      return {
        mode: "post",
      };
    }
  }

  // =========================
  // 発言なし
  // =========================

  return null;
}

module.exports = checkScheduler;
