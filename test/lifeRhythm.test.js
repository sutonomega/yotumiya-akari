const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getLifeRhythmSlot,
  getScheduleHours,
  shouldPostAt,
} = require("../functions/lifeRhythm");

test("hourly schedule uses configured hourly hours", () => {
  assert.deepEqual(
    getScheduleHours({ postScheduleMode: "hourly", hourlyPostHours: [0, 6, 12] }),
    [0, 6, 12],
  );
});

test("daily4 schedule uses dailyPostHours", () => {
  assert.deepEqual(
    getScheduleHours({ postScheduleMode: "daily4", dailyPostHours: [6, 12, 18, 22] }),
    [6, 12, 18, 22],
  );
});

test("custom schedule uses postScheduleHours", () => {
  assert.deepEqual(
    getScheduleHours({ postScheduleMode: "custom", postScheduleHours: [9, 21] }),
    [9, 21],
  );
});

test("post fires only on configured minute and allowed hour", () => {
  const settings = {
    postScheduleMode: "daily4",
    postScheduleMinute: 10,
    dailyPostHours: [6, 12, 18, 22],
  };

  assert.equal(
    shouldPostAt({
      currentState: { hour: 12, minute: 0, timeText: "daytime" },
      settings,
      schedulerData: {},
    }),
    null,
  );

  assert.equal(
    shouldPostAt({
      currentState: { hour: 13, minute: 10, timeText: "daytime" },
      settings,
      schedulerData: {},
    }),
    null,
  );

  const event = shouldPostAt({
    currentState: { hour: 12, minute: 10, timeText: "daytime" },
    settings,
    schedulerData: {},
  });

  assert.equal(event.kind, "daytime_time_signal");
  assert.equal(event.currentSlot, "daily4:12:10:daytime_time_signal");
});

test("same currentSlot is treated as duplicate", () => {
  const event = shouldPostAt({
    currentState: { hour: 6, minute: 0, timeText: "morning" },
    settings: { postScheduleMode: "hourly", postScheduleMinute: 0 },
    schedulerData: { lastPostTime: "hourly:6:0:good_morning" },
  });

  assert.equal(event, null);
});

test("life rhythm slot reuses currentState timeText", () => {
  assert.deepEqual(getLifeRhythmSlot({ hour: 18, timeText: "evening" }), {
    kind: "evening_time_signal",
    timeText: "evening",
    prompt: "",
  });
});


test("life rhythm slot identifies morning and night special slots", () => {
  assert.equal(getLifeRhythmSlot({ hour: 6, timeText: "morning" }).kind, "good_morning");
  assert.equal(getLifeRhythmSlot({ hour: 22, timeText: "night" }).kind, "good_night");
});
