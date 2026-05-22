const fs = require("fs");

const log = require("./logger");

const getCurrentState = require("./functions/getCurrentState");

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

    moodData,

    schedulerData,

    diffHours,
  } = getCurrentState();

  // =========================
  // 最終自発発言時間
  // =========================

  let autoDiffHours = 999;

  if (schedulerData.lastAutoMessage) {
    const lastAuto = new Date(schedulerData.lastAutoMessage);

    autoDiffHours = (now - lastAuto) / (1000 * 60 * 60);
  }

  // =========================
  // 自発発言判定
  // =========================

  if (diffHours >= 1 && autoDiffHours >= settings.selfTalkIntervalHours) {
    log("SYSTEM", "自発発言要求");

    schedulerData.lastAutoMessage = now.toISOString();

    fs.writeFileSync(
      "memory/scheduler.json",

      JSON.stringify(schedulerData, null, 2),
    );

    return {
      mode: "self_talk",
    };
  }

  // =========================
  // 定時つぶやき判定
  // =========================

  const postHours = [7, 12, 18, 23];

  const currentSlot = `${hour}:${minute}`;

  if (postHours.includes(hour) && minute === 0) {
    if (schedulerData.lastPostTime !== currentSlot) {
      log("SYSTEM", "定時つぶやき要求");

      schedulerData.lastPostTime = currentSlot;

      fs.writeFileSync(
        "memory/scheduler.json",

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
