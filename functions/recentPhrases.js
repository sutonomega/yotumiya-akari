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
    // ========================================
    // short phrase ignore
    // ========================================

    if (phrase.length < 12) {
      continue;
    }

    // ========================================
    // protected ai name
    // ========================================

    if (phrase.includes(settings.aiName)) {
      continue;
    }

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

  // ========================================
  // no penalty
  // ========================================

  if (penalty === 0) {
    return message;
  }

  // ========================================
  // do not destroy message
  // ========================================

  console.log("[RECENT PHRASE SUPPRESSED]", message);

  return message;
}

module.exports = {
  loadRecentPhrases,
  repetitionPenalty,
  saveRecentPhrases,
  suppressRecentPhrases,
};
