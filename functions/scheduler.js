const log = require("./logger");
const getCurrentState = require("./getCurrentState");
const { shouldPostAt } = require("./lifeRhythm");
const { runNightlyProcess, shouldRunNightly } = require("./nightlyProcess");
const { writeState } = require("./stateStore");

async function checkScheduler() {
  log.system("scheduler check");

  const { settings, now, hour, minute, schedulerData } = getCurrentState();

  if (shouldRunNightly(settings, now)) {
    await runNightlyProcess(settings, now);
  }

  const postSlot = shouldPostAt({ hour, minute, schedulerData });

  if (!postSlot) {
    return null;
  }

  schedulerData.lastPostTime = postSlot.currentSlot;
  writeState("scheduler.json", schedulerData, settings);

  log.system("scheduled post requested", {
    hour,
    minute,
    kind: postSlot.kind,
  });

  return {
    mode: postSlot.mode,
    kind: postSlot.kind,
    prompt: postSlot.prompt,
  };
}

module.exports = checkScheduler;
