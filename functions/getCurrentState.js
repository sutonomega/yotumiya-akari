const loadSettings = require("./loadSettings");
const { readState } = require("./stateStore");

function getTimeText(hour) {
  if (hour >= 5 && hour < 11) {
    return "morning";
  }

  if (hour >= 11 && hour < 18) {
    return "daytime";
  }

  if (hour >= 18 && hour < 22) {
    return "evening";
  }

  return "night";
}

function getCurrentState(overrides = {}) {
  const settings = overrides.settings || loadSettings();
  const now = overrides.now || new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeText = getTimeText(hour);

  const moodData = readState(
    "mood.json",
    {
      mood: "calm",
      energy: settings.maxEnergy,
      atmosphere: "quiet",
      lastTalkTime: now.toISOString(),
    },
    settings,
  );

  const schedulerData = readState(
    "scheduler.json",
    {
      lastAutoMessage: null,
      lastPostTime: null,
    },
    settings,
  );

  const talkStats = readState(
    "talk_stats.json",
    {
      todayCount: 0,
      lastTalkDate: now.toISOString().split("T")[0],
    },
    settings,
  );

  const lastTalkTime = new Date(moodData.lastTalkTime || now);
  const diffMs = now - lastTalkTime;
  const diffHours = diffMs / (1000 * 60 * 60);

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
