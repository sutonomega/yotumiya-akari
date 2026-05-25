const { classifyConversation } = require("./conversationCategory");
const getCurrentState = require("./getCurrentState");
const { getCalendarState } = require("./calendarState");
const { readState } = require("./stateStore");

function getWeatherState(settings) {
  return readState(
    "weather.json",
    {
      summary: settings.defaultWeather || "unknown",
      temperature: null,
      updatedAt: null,
    },
    settings,
  );
}

async function getEnvironmentState({
  settings = null,
  now = null,
  userMessage = "",
} = {}) {
  const base = getCurrentState({ settings, now });
  const weather = getWeatherState(base.settings);
  const calendar = await getCalendarState(base.settings, base.now);
  const conversation = {
    category: classifyConversation(userMessage, base),
    queue: readState("conversation_state.json", { lastCategory: null }, base.settings),
  };

  return {
    ...base,
    weather,
    calendar,
    conversation,
  };
}

module.exports = {
  getEnvironmentState,
  getWeatherState,
};
