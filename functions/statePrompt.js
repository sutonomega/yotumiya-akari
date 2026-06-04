const { formatTimeText } = require("./timeFormatter");

function isWeatherUnknown(weather) {
  return !weather || !weather.summary || weather.summary === "unknown";
}

function formatWeather(weather) {
  if (isWeatherUnknown(weather)) {
    return "不明";
  }

  const temperature =
    weather.temperature === null || weather.temperature === undefined
      ? ""
      : `、${weather.temperature}度`;

  return `${weather.summary}${temperature}`;
}

function isPrivateEvent(title, settings) {
  const normalized = String(title || "").trim();

  const keywords = settings.calendarPrivateKeywords || [];

  return keywords.some((keyword) =>
    normalized.toLowerCase().startsWith(keyword.toLowerCase()),
  );
}

function formatEventList(events, settings) {
  if (!Array.isArray(events) || events.length === 0) {
    return "なし";
  }

  const visibleEvents = events.filter(
    (event) => !isPrivateEvent(event.title, settings),
  );

  if (visibleEvents.length === 0) {
    return "なし";
  }

  return visibleEvents.map((event) => event.title).join("、");
}

function composeStatePrompt(currentState, settings) {
  const lines = [
    `現在時刻: ${formatTimeText(currentState.hour)}`,
    `時間帯: ${currentState.timeText || "不明"}`,
    `天気: ${formatWeather(currentState.weather)}`,
    isWeatherUnknown(currentState.weather)
      ? "天候制約: 天候情報が不明なため、天候を断定しない。雨・晴れ・曇り・雪・風・揺れなどを書かない"
      : "",
    `気分: ${currentState.moodData?.mood || "不明"}`,
    `会話カテゴリ: ${currentState.conversation?.category || "casual"}`,
    `現在の予定: ${formatEventList(currentState.calendar?.currentEvents, settings)}`,
    `直近で終わった予定: ${formatEventList(currentState.calendar?.recentlyEndedEvents, settings)}`,
    `このあとの予定: ${formatEventList(currentState.calendar?.upcomingEvents, settings)}`,
  ];

  return lines.filter(Boolean).join("\n");
}

module.exports = {
  composeStatePrompt,
  formatWeather,
  isWeatherUnknown,
};
