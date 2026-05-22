// =========================
// mood更新
// =========================

function updateMood({
  moodData,

  settings,

  hour,

  diffHours,

  mode,
}) {
  // =========================
  // 時間経過による回復
  // =========================

  moodData.energy += Math.floor(diffHours * settings.energyRecoveryPerHour);

  // =========================
  // energy上限制限
  // =========================

  if (moodData.energy > settings.maxEnergy) {
    moodData.energy = settings.maxEnergy;
  }

  // =========================
  // energy下限制限
  // =========================

  if (moodData.energy < 20) {
    moodData.energy = 20;
  }

  // =========================
  // 時間帯による雰囲気
  // =========================

  if (hour >= 0 && hour <= 4) {
    moodData.atmosphere = "深夜の静かな空気";
  } else if (hour <= 10) {
    moodData.atmosphere = "朝の静かな空気";
  } else if (hour <= 17) {
    moodData.atmosphere = "昼の穏やかな空気";
  } else {
    moodData.atmosphere = "夕方から夜の空気";
  }

  // =========================
  // energyによる感情
  // =========================

  if (moodData.energy <= 30) {
    moodData.mood = "少し疲れてる";
  } else if (moodData.energy >= 80) {
    moodData.mood = "元気";
  } else {
    moodData.mood = "落ち着いている";
  }

  // =========================
  // 通常会話のみ疲労
  // =========================

  if (mode === "reply") {
    moodData.energy -= settings.energyDecrease;
  }

  // =========================
  // energy最終制限
  // =========================

  if (moodData.energy > settings.maxEnergy) {
    moodData.energy = settings.maxEnergy;
  }

  if (moodData.energy < 0) {
    moodData.energy = 0;
  }

  return moodData;
}

module.exports = updateMood;
