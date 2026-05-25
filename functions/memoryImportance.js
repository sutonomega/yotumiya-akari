const LEVELS = Object.freeze({
  short: { ttlDays: 1, maxItems: 50 },
  middle: { ttlDays: 14, maxItems: 100 },
  long: { ttlDays: 180, maxItems: 200 },
  permanent: { ttlDays: null, maxItems: 500 },
});

function classifyImportance(text, hints = {}) {
  const normalized = String(text || "").toLowerCase();

  if (hints.permanent || /名前|誕生日|大事|絶対|always|permanent/.test(normalized)) {
    return "permanent";
  }

  if (hints.long || /好き|嫌い|習慣|目標|long/.test(normalized)) {
    return "long";
  }

  if (hints.middle || /予定|最近|今週|middle/.test(normalized)) {
    return "middle";
  }

  return "short";
}

function decorateMemory(text, importance, category = "casual", tags = []) {
  const cleanText = String(text || "").replace(/^-+\s*/, "").trim();
  const tagText = tags.map((tag) => `#${tag}`).join(" ");
  const suffix = [importance, `[${category}]`, tagText].filter(Boolean).join(" ");
  return `- ${cleanText} ${suffix}`.trim();
}

function pruneByImportance(items, now = new Date()) {
  const byLevel = new Map();

  for (const item of items) {
    const level = item.importance || "middle";
    const bucket = byLevel.get(level) || [];
    bucket.push(item);
    byLevel.set(level, bucket);
  }

  const result = [];

  for (const [level, bucket] of byLevel.entries()) {
    const rule = LEVELS[level] || LEVELS.middle;
    const filtered = bucket.filter((item) => {
      if (!rule.ttlDays || !item.createdAt) {
        return true;
      }

      const ageMs = now - new Date(item.createdAt);
      return ageMs <= rule.ttlDays * 24 * 60 * 60 * 1000;
    });

    result.push(...filtered.slice(-rule.maxItems));
  }

  return result;
}

module.exports = {
  LEVELS,
  classifyImportance,
  decorateMemory,
  pruneByImportance,
};
