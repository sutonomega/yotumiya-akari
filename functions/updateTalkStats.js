// =========================
// 会話統計更新
// =========================

function updateTalkStats({
  talkStats,

  now,

  mode,
}) {
  // =========================
  // 今日の日付
  // =========================

  const today = now.toISOString().split("T")[0];

  // =========================
  // 日付変更チェック
  // =========================

  if (talkStats.lastTalkDate !== today) {
    talkStats.todayCount = 0;
  }

  // =========================
  // 最終会話日更新
  // =========================

  talkStats.lastTalkDate = today;

  // =========================
  // 通常会話のみ加算
  // =========================

  if (mode === "reply") {
    talkStats.todayCount += 1;
  }

  return talkStats;
}

module.exports = updateTalkStats;
