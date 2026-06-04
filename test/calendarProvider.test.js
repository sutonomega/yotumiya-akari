const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildGoogleCalendarUrl,
  readGoogleEvents,
} = require("../functions/calendarProvider");

test("buildGoogleCalendarUrl limits Google Calendar events to the relevant window", () => {
  const url = new URL(buildGoogleCalendarUrl(
    {
      googleCalendarUrl: "https://calendar.example/events?key=abc",
      calendarEndedWindowMinutes: 60,
      calendarUpcomingWindowHours: 6,
      calendarMaxResults: 12,
    },
    new Date("2026-06-04T12:00:00.000Z"),
  ));

  assert.equal(url.origin + url.pathname, "https://calendar.example/events");
  assert.equal(url.searchParams.get("key"), "abc");
  assert.equal(url.searchParams.get("singleEvents"), "true");
  assert.equal(url.searchParams.get("orderBy"), "startTime");
  assert.equal(url.searchParams.get("timeMin"), "2026-06-04T11:00:00.000Z");
  assert.equal(url.searchParams.get("timeMax"), "2026-06-04T18:00:00.000Z");
  assert.equal(url.searchParams.get("maxResults"), "12");
});

test("readGoogleEvents fetches the bounded URL and normalizes events", async (t) => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(new URL(url));
    return {
      ok: true,
      async json() {
        return {
          items: [
            {
              id: "event-1",
              summary: "予定",
              start: { dateTime: "2026-06-04T12:30:00.000Z" },
              end: { dateTime: "2026-06-04T13:00:00.000Z" },
            },
          ],
        };
      },
    };
  };
  t.after(() => {
    global.fetch = originalFetch;
  });

  const events = await readGoogleEvents(
    {
      googleCalendarUrl: "https://calendar.example/events",
      calendarFetchTimeoutMs: 1000,
      calendarEndedWindowMinutes: 30,
      calendarUpcomingWindowHours: 2,
      calendarMaxResults: 5,
    },
    new Date("2026-06-04T12:00:00.000Z"),
  );

  assert.equal(calls[0].searchParams.get("timeMin"), "2026-06-04T11:30:00.000Z");
  assert.equal(calls[0].searchParams.get("timeMax"), "2026-06-04T14:00:00.000Z");
  assert.equal(calls[0].searchParams.get("singleEvents"), "true");
  assert.equal(calls[0].searchParams.get("orderBy"), "startTime");
  assert.equal(calls[0].searchParams.get("maxResults"), "5");
  assert.deepEqual(events, [
    {
      id: "event-1",
      title: "予定",
      start: "2026-06-04T12:30:00.000Z",
      end: "2026-06-04T13:00:00.000Z",
      source: "google",
    },
  ]);
});
