const { formatTimeText } = require("./timeFormatter");

function formatWeather(weather) {
  if (!weather || weather.summary === "unknown") {
    return "不明";
  }

  const temperature =
    weather.temperature === null || weather.temperature === undefined
      ? ""
      : `、${weather.temperature}度`;

  return `${weather.summary}${temperature}`;
}

function formatEventList(events) {
  if (!Array.isArray(events) || events.length === 0) {
    return "なし";
  }

  return events.map((event) => event.title).join("、");
}

function composeStatePrompt(currentState) {
  const lines = [
    `現在時刻: ${formatTimeText(currentState.hour)}`,
    `時間帯: ${currentState.timeText || "不明"}`,
    `天気: ${formatWeather(currentState.weather)}`,
    `気分: ${currentState.moodData?.mood || "不明"}`,
    `会話カテゴリ: ${currentState.conversation?.category || "casual"}`,
    `現在の予定: ${formatEventList(currentState.calendar?.currentEvents)}`,
    `直近で終わった予定: ${formatEventList(currentState.calendar?.recentlyEndedEvents)}`,
    `このあとの予定: ${formatEventList(currentState.calendar?.upcomingEvents)}`,
  ];

  return lines.join("\n");
}

module.exports = {
  composeStatePrompt,
};
