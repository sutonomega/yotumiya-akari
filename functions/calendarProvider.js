const fs = require("fs");
const path = require("path");

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
  const filePath = path.join(process.cwd(), settings.memoryDir, "calendar.json");

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
  if (!settings.calendarIcsUrl && !settings.calendarIcsPath) {
    return [];
  }

  if (settings.calendarIcsUrl) {
    const response = await fetch(settings.calendarIcsUrl);
    return parseIcsEvents(await response.text());
  }

  const filePath = path.resolve(process.cwd(), settings.calendarIcsPath);
  return parseIcsEvents(fs.readFileSync(filePath, "utf-8"));
}

async function readGoogleEvents(settings) {
  if (!settings.googleCalendarUrl) {
    return [];
  }

  const response = await fetch(settings.googleCalendarUrl);
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
  parseIcsEvents,
  readGoogleEvents,
  readIcsEvents,
  readLocalEvents,
};
