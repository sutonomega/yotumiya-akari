const fs = require("fs");

const loadJson = require("./loadJson");

// =========================
// settings読み込み
// =========================

const settings = JSON.parse(fs.readFileSync("config/settings.json", "utf-8"));

// =========================
// 時間帯取得
// =========================

function getTimeText(hour) {
  if (hour >= 5 && hour < 11) {
    return "朝";
  }

  if (hour >= 11 && hour < 18) {
    return "昼";
  }

  if (hour >= 18 && hour < 22) {
    return "夕方";
  }

  return "夜";
}

// =========================
// 現在状態取得
// =========================

function getCurrentState() {
  // =========================
  // 現在時刻
  // =========================

  const now = new Date();

  const hour = now.getHours();

  const minute = now.getMinutes();

  const timeText = getTimeText(hour);

  // =========================
  // mood
  // =========================

  const moodData = loadJson(
    "memory/mood.json",

    {
      mood: "落ち着いている",

      energy: settings.maxEnergy,

      atmosphere: "静かな空気",

      lastTalkTime: now.toISOString(),
    },
  );

  // =========================
  // scheduler
  // =========================

  const schedulerData = loadJson(
    "memory/scheduler.json",

    {
      lastAutoMessage: null,

      lastPostTime: null,
    },
  );

  // =========================
  // talk stats
  // =========================

  const talkStats = loadJson(
    "memory/talk_stats.json",

    {
      todayCount: 0,

      lastTalkDate: now.toISOString().split("T")[0],
    },
  );

  // =========================
  // 最終会話時間
  // =========================

  const lastTalkTime = new Date(moodData.lastTalkTime);

  const diffMs = now - lastTalkTime;

  const diffHours = diffMs / (1000 * 60 * 60);

  // =========================
  // return
  // =========================

  return {
    settings,

    now,

    hour,

    minute,

    timeText,

    moodData,

    schedulerData,

    talkStats,

    lastTalkTime,

    diffMs,

    diffHours,
  };
}

module.exports = getCurrentState;
