const compressHistory = require("./compressHistory");
const log = require("./logger");
const { normalizeLongMemory } = require("./longMemory");
const { savePersonalityRules } = require("./personalityRules");
const { readState, writeState } = require("./stateStore");

function shouldRunNightly(settings, now = new Date()) {
  if (settings.enableNightlyProcess === false) {
    return false;
  }

  const hour = now.getHours();
  const today = now.toISOString().split("T")[0];
  const state = readState("nightly_process.json", { lastRunDate: null }, settings);

  return hour === (settings.nightlyProcessHour ?? 3) && state.lastRunDate !== today;
}

async function runNightlyProcess(settings, now = new Date()) {
  log.system("nightly process start");

  const rules = savePersonalityRules(settings);
  normalizeLongMemory(settings);
  await compressHistory(settings);

  writeState(
    "nightly_process.json",
    {
      lastRunDate: now.toISOString().split("T")[0],
      lastRunAt: now.toISOString(),
      distilledRuleCount: rules.length,
    },
    settings,
  );

  log.system("nightly process finished", { distilledRuleCount: rules.length });

  return {
    rules,
  };
}

module.exports = {
  runNightlyProcess,
  shouldRunNightly,
};
