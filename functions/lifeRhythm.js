const DEFAULT_HOURLY_POST_HOURS = Object.freeze([
  0,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
]);
const DEFAULT_DAILY_POST_HOURS = Object.freeze([6, 12, 18, 22]);

function normalizeHours(hours, fallback) {
  if (!Array.isArray(hours)) {
    return fallback;
  }

  const normalized = hours
    .map((hour) => Number(hour))
    .filter((hour) => Number.isInteger(hour) && hour >= 0 && hour <= 23);

  return normalized.length > 0 ? [...new Set(normalized)] : fallback;
}

function getScheduleHours(settings = {}) {
  if (settings.postScheduleMode === "daily4") {
    return normalizeHours(settings.dailyPostHours, DEFAULT_DAILY_POST_HOURS);
  }

  if (settings.postScheduleMode === "custom") {
    return normalizeHours(settings.postScheduleHours, DEFAULT_HOURLY_POST_HOURS);
  }

  return normalizeHours(settings.hourlyPostHours, DEFAULT_HOURLY_POST_HOURS);
}

function getLifeRhythmSlot(currentState = {}) {
  const hour = currentState.hour;
  const timeText = currentState.timeText || "night";

  if (hour === 6) {
    return {
      mode: "post",
      kind: "good_morning",
      timeText,
      prompt: "",
    };
  }

  if (hour === 0 || hour === 22 || hour === 23) {
    return {
      mode: "post",
      kind: "good_night",
      timeText,
      prompt: "",
    };
  }

  return {
    mode: "post",
    kind: timeText + "_time_signal",
    timeText,
    prompt: "",
  };
}

function shouldPostAt({ currentState, settings = {}, schedulerData }) {
  const hour = currentState.hour;
  const minute = currentState.minute;
  const postMinute = Number.isInteger(settings.postScheduleMinute)
    ? settings.postScheduleMinute
    : 0;

  if (minute !== postMinute) {
    return null;
  }

  if (!getScheduleHours(settings).includes(hour)) {
    return null;
  }

  const slot = getLifeRhythmSlot(currentState);
  const currentSlot = [
    settings.postScheduleMode || "hourly",
    hour,
    minute,
    slot.kind,
  ].join(":");

  if (schedulerData.lastPostTime === currentSlot) {
    return null;
  }

  return {
    ...slot,
    currentSlot,
  };
}

module.exports = {
  getLifeRhythmSlot,
  getScheduleHours,
  shouldPostAt,
};
