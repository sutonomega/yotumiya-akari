const fs = require("fs");
const path = require("path");

function buildGoogleCalendarUrl(settings, now = new Date()) {
  const url = new URL(settings.googleCalendarUrl);
  const endedWindowMs = (settings.calendarEndedWindowMinutes || 0) * 60 * 1000;
  const upcomingWindowMs = (settings.calendarUpcomingWindowHours || 6) * 60 * 60 * 1000;
  const timeMin = new Date(now.getTime() - endedWindowMs);
  const timeMax = new Date(now.getTime() + upcomingWindowMs);

  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("maxResults", String(settings.calendarMaxResults || 20));

  return url.toString();
}

async function fetchWithTimeout(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Calendar fetch failed: ${response.status}`);
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEvent(event) {
  return {
    id: event.id || `${event.title || event.summary}-${event.start}`,
    title: event.title || event.summary || "予定",
    start: new Date(event.start || event.startTime).toISOString(),
    end: new Date(event.end || event.endTime).toISOString(),
    source: event.source || "local",
  };
}

function readLocalEvents(settings) {
  const filePath = path.join(
    process.cwd(),
    settings.memoryDir,
    "calendar.json",
  );

  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8")).map(normalizeEvent);
}

function unfoldIcsLines(text) {
  return String(text || "").replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value) {
  if (!value) {
    return null;
  }

  if (/^\d{8}T\d{6}Z$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}Z`,
    );
  }

  if (/^\d{8}T\d{6}$/.test(value)) {
    return new Date(
      `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:${value.slice(13, 15)}`,
    );
  }

  return new Date(value);
}

function parseIcsEvents(icsText) {
  const events = [];
  const blocks = unfoldIcsLines(icsText).split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const lines = block.split(/\r?\n/);
    const getValue = (name) => {
      const line = lines.find((candidate) => candidate.startsWith(name));
      return line ? line.split(":").slice(1).join(":").trim() : "";
    };

    const start = parseIcsDate(getValue("DTSTART"));
    const end = parseIcsDate(getValue("DTEND"));

    if (!start || !end) {
      continue;
    }

    events.push(
      normalizeEvent({
        id: getValue("UID"),
        title: getValue("SUMMARY"),
        start,
        end,
        source: "ics",
      }),
    );
  }

  return events;
}

async function readIcsEvents(settings) {
  try {
    if (!settings.calendarIcsUrl && !settings.calendarIcsPath) {
      return [];
    }

    if (settings.calendarIcsUrl) {
      const response = await fetchWithTimeout(
        settings.calendarIcsUrl,
        settings.calendarFetchTimeoutMs,
      );
      return parseIcsEvents(await response.text());
    }

    const filePath = path.resolve(process.cwd(), settings.calendarIcsPath);
    return parseIcsEvents(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    // =========================
    // timeout
    // =========================

    if (error.name === "AbortError") {
      console.log("[CALENDAR TIMEOUT] ICS fetch timeout");

      return [];
    }

    // =========================
    // normal error
    // =========================

    console.log("[CALENDAR ERROR]", error);

    return [];
  }
}

async function readGoogleEvents(settings, now = new Date()) {
  try {
    if (!settings.googleCalendarUrl) {
      return [];
    }

    const response = await fetchWithTimeout(
      buildGoogleCalendarUrl(settings, now),
      settings.calendarFetchTimeoutMs,
    );
    const data = await response.json();
    return (data.items || []).map((item) =>
      normalizeEvent({
        id: item.id,
        title: item.summary,
        start: item.start?.dateTime || item.start?.date,
        end: item.end?.dateTime || item.end?.date,
        source: "google",
      }),
    );
  } catch (error) {
    // =========================
    // timeout
    // =========================

    if (error.name === "AbortError") {
      console.log("[CALENDAR TIMEOUT] Google Calendar fetch timeout");

      return [];
    }

    // =========================
    // normal error
    // =========================

    console.log("[CALENDAR ERROR]", error);

    return [];
  }
}

async function getCalendarEvents(settings) {
  const provider = settings.calendarProvider || "local";

  if (provider === "ics" || provider === "icloud") {
    return readIcsEvents(settings);
  }

  if (provider === "google") {
    return readGoogleEvents(settings);
  }

  return readLocalEvents(settings);
}

module.exports = {
  getCalendarEvents,
  buildGoogleCalendarUrl,
  fetchWithTimeout,
  parseIcsEvents,
  readGoogleEvents,
  readIcsEvents,
  readLocalEvents,
};
