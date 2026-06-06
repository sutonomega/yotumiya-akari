const fs = require("fs");
const path = require("path");

const { repetitionPenalty } = require("./recentPhrases");
const { readState, writeState } = require("./stateStore");

const DEFAULT_SAFETY_CONFIG = {
  fallbackLogFile: "time_signal_fallbacks.json",
  fallbackLogLimit: 100,
  commonDangerTerms: [],
  concreteTerms: [],
  unknownWeatherTerms: [],
  timeBands: {},
  defaultFallback: "",
};

let cachedSafetyConfig = null;

function resolveSafetyConfigPath(options = {}) {
  return options.filePath || path.join(
    options.baseDir || process.cwd(),
    "config",
    "time_signal_safety.json",
  );
}

function readSafetyConfig(options = {}) {
  const filePath = resolveSafetyConfigPath(options);
  const existsSync = options.existsSync || fs.existsSync;
  const readFileSync = options.readFileSync || fs.readFileSync;

  if (!existsSync(filePath)) {
    return DEFAULT_SAFETY_CONFIG;
  }

  return {
    ...DEFAULT_SAFETY_CONFIG,
    ...JSON.parse(readFileSync(filePath, "utf-8")),
  };
}

function hasConfigOptions(options = {}) {
  return Object.keys(options).length > 0;
}

function loadSafetyConfig(options = {}) {
  if (hasConfigOptions(options)) {
    return readSafetyConfig(options);
  }

  if (!cachedSafetyConfig) {
    cachedSafetyConfig = readSafetyConfig();
  }

  return cachedSafetyConfig;
}

function reloadSafetyConfig(options = {}) {
  const config = readSafetyConfig(options);

  if (!hasConfigOptions(options)) {
    cachedSafetyConfig = config;
  }

  return config;
}

function timeBand(currentState = {}) {
  return currentState.timeText || "night";
}

function includesAny(text, terms) {
  return (terms || []).find((term) => text.includes(term));
}

function timeBandConfig(config, currentState) {
  return config.timeBands?.[timeBand(currentState)] || { fallback: [], blocked: [] };
}

function isWeatherUnknown(currentState = {}) {
  const summary = currentState.weather?.summary;
  return !summary || summary === "unknown";
}

function validateTimeSignalText(text, currentState = {}, config = loadSafetyConfig()) {
  const body = String(text || "").trim();
  const reasons = [];
  const band = timeBandConfig(config, currentState);

  if (!body || body.length < 8) {
    reasons.push("too_short");
  }

  if (body.length > 70) {
    reasons.push("too_long");
  }

  if (/[A-Za-z]/.test(body)) {
    reasons.push("ascii_letters");
  }

  if (/午前|午後|\d+時/.test(body)) {
    reasons.push("time_in_body");
  }

  if (/ます。?$/.test(body)) {
    reasons.push("polite_form");
  }

  const danger = includesAny(body, config.commonDangerTerms);
  if (danger) {
    reasons.push(`danger:${danger}`);
  }

  const blocked = includesAny(body, band.blocked);
  if (blocked) {
    reasons.push(`time_mismatch:${blocked}`);
  }

  const weather = isWeatherUnknown(currentState)
    ? includesAny(body, config.unknownWeatherTerms)
    : null;
  if (weather) {
    reasons.push(`weather_unknown:${weather}`);
  }

  if (!includesAny(body, config.concreteTerms)) {
    reasons.push("no_concrete_object");
  }

  return {
    safe: reasons.length === 0,
    reasons,
  };
}

function pickFallback(currentState = {}, config = loadSafetyConfig(), settings = null) {
  const candidates = timeBandConfig(config, currentState).fallback || [];

  if (candidates.length === 0) {
    return config.defaultFallback || "";
  }

  const available = settings
    ? candidates.filter((candidate) => repetitionPenalty(settings, candidate) === 0)
    : candidates;
  const pool = available.length > 0 ? available : candidates;

  return pool[Math.floor(Math.random() * pool.length)];
}

function applyRecentPhraseValidation(validation, settings, text) {
  if (validation.safe && repetitionPenalty(settings, text) > 0) {
    return {
      safe: false,
      reasons: ["recent_phrase"],
    };
  }

  return validation;
}

function saveFallbackLog({ settings, currentState, attempts, originalText, finalText, reasons, config }) {
  const fileName = config.fallbackLogFile || DEFAULT_SAFETY_CONFIG.fallbackLogFile;
  const limit = config.fallbackLogLimit || DEFAULT_SAFETY_CONFIG.fallbackLogLimit;
  const state = readState(fileName, { items: [] }, settings);
  const item = {
    createdAt: new Date().toISOString(),
    hour: currentState.hour,
    timeText: currentState.timeText,
    attempts,
    reasons,
    originalText,
    fallbackText: finalText,
  };

  return writeState(
    fileName,
    {
      items: [...(state.items || []), item].slice(-limit),
    },
    settings,
  );
}

async function repairTimeSignalPost({ settings, currentState, message, regenerate }) {
  const config = loadSafetyConfig();
  const maxAttempts = Math.max(0, Number(settings.timeSignalRepairMaxAttempts || 0));
  let current = String(message || "").trim();
  let validation = applyRecentPhraseValidation(
    validateTimeSignalText(current, currentState, config),
    settings,
    current,
  );
  const originalText = current;
  let attempts = 0;

  while (!validation.safe && attempts < maxAttempts) {
    attempts += 1;

    try {
      current = String(await regenerate({ previousText: current, reasons: validation.reasons })).trim();
      validation = applyRecentPhraseValidation(
        validateTimeSignalText(current, currentState, config),
        settings,
        current,
      );
    } catch (error) {
      validation = {
        safe: false,
        reasons: [...validation.reasons, `repair_failed:${error.message}`],
      };
      break;
    }
  }

  if (validation.safe) {
    return {
      fallbackUsed: false,
      message: current,
      attempts,
      reasons: [],
    };
  }

  const fallback = pickFallback(currentState, config, settings);
  saveFallbackLog({
    settings,
    currentState,
    attempts,
    originalText,
    finalText: fallback,
    reasons: validation.reasons,
    config,
  });

  return {
    fallbackUsed: true,
    message: fallback,
    attempts,
    reasons: validation.reasons,
  };
}

module.exports = {
  loadSafetyConfig,
  readSafetyConfig,
  reloadSafetyConfig,
  pickFallback,
  repairTimeSignalPost,
  isWeatherUnknown,
  applyRecentPhraseValidation,
  timeBand,
  validateTimeSignalText,
};
