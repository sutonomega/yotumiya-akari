const { getCalendarEvents } = require("./calendarProvider");

function buildCalendarPrompt(calendarState) {
  const parts = [];

  if (calendarState.currentEvents.length > 0) {
    parts.push(
      `今の予定: ${calendarState.currentEvents.map((event) => event.title).join(", ")}`,
    );
  }

  if (calendarState.recentlyEndedEvents.length > 0) {
    parts.push(
      `さっき終わった予定: ${calendarState.recentlyEndedEvents
        .map((event) => `${event.title}。必要なら「終わった？」のように自然に触れる`)
        .join(", ")}`,
    );
  }

  if (calendarState.upcomingEvents.length > 0) {
    parts.push(
      `このあと: ${calendarState.upcomingEvents
        .map((event) => `${event.title} (${new Date(event.start).getHours()}時台)`)
        .join(", ")}`,
    );
  }

  return parts.join("\n");
}

async function getCalendarState(settings, now = new Date()) {
  const events = await getCalendarEvents(settings);
  const nowTime = now.getTime();
  const endedWindowMs = (settings.calendarEndedWindowMinutes || 60) * 60 * 1000;
  const upcomingWindowMs = (settings.calendarUpcomingWindowHours || 6) * 60 * 60 * 1000;

  const currentEvents = events.filter((event) => {
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return start <= nowTime && nowTime <= end;
  });

  const recentlyEndedEvents = events.filter((event) => {
    const end = new Date(event.end).getTime();
    return end < nowTime && nowTime - end <= endedWindowMs;
  });

  const upcomingEvents = events
    .filter((event) => {
      const start = new Date(event.start).getTime();
      return start > nowTime && start - nowTime <= upcomingWindowMs;
    })
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, 3);

  const calendarState = {
    events,
    currentEvents,
    recentlyEndedEvents,
    upcomingEvents,
  };

  return {
    ...calendarState,
    prompt: buildCalendarPrompt(calendarState),
  };
}

module.exports = {
  buildCalendarPrompt,
  getCalendarState,
};
