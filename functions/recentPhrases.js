const { readState, writeState } = require("./stateStore");

const FILE_NAME = "recent_phrases.json";

function splitPhrases(text) {
  return String(text || "")
    .split(/[。！？!?\n]/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => phrase.length >= 4)
    .slice(0, 8);
}

function loadRecentPhrases(settings) {
  return readState(FILE_NAME, { phrases: [] }, settings);
}

function saveRecentPhrases(settings, message, limit = 80) {
  const state = loadRecentPhrases(settings);
  const next = [...state.phrases, ...splitPhrases(message)]
    .map((phrase) => phrase.trim())
    .filter(Boolean)
    .slice(-limit);

  return writeState(FILE_NAME, { phrases: next }, settings);
}

function similarity(a, b) {
  const left = new Set(String(a).split(""));
  const right = new Set(String(b).split(""));

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let hit = 0;
  for (const char of left) {
    if (right.has(char)) {
      hit += 1;
    }
  }

  return hit / Math.max(left.size, right.size);
}

function repetitionPenalty(settings, candidate) {
  const recent = loadRecentPhrases(settings).phrases || [];
  const phrases = splitPhrases(candidate);

  let penalty = 0;

  for (const phrase of phrases) {
    for (const previous of recent.slice(-30)) {
      if (phrase === previous || similarity(phrase, previous) >= 0.72) {
        penalty += 1;
      }
    }
  }

  return penalty;
}

function suppressRecentPhrases(settings, message) {
  const penalty = repetitionPenalty(settings, message);

  if (penalty === 0) {
    return message;
  }

  const phrases = splitPhrases(message);
  const recent = new Set((loadRecentPhrases(settings).phrases || []).slice(-30));

  for (const phrase of phrases) {
    if (recent.has(phrase)) {
      return message.replace(phrase, "").trim();
    }
  }

  return message;
}

module.exports = {
  loadRecentPhrases,
  repetitionPenalty,
  saveRecentPhrases,
  suppressRecentPhrases,
};
