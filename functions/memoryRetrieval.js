const fs = require("fs");
const path = require("path");

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function parseMemoryLine(line) {
  const raw = line.trim();
  const text = raw.replace(/^-+\s*/, "");
  const tagMatches = [...text.matchAll(/#([\p{L}\p{N}_-]+)/gu)].map(
    (match) => match[1].toLowerCase(),
  );

  const categoryMatch = text.match(/\[(technical|emotional|casual|sleepy|playful|system)\]/i);
  const importanceMatch = text.match(/\b(short|middle|long|permanent)\b/i);

  return {
    raw,
    text,
    tags: tagMatches,
    category: categoryMatch ? categoryMatch[1].toLowerCase() : "casual",
    importance: importanceMatch ? importanceMatch[1].toLowerCase() : "middle",
    keywords: tokenize(text),
  };
}

function loadMemoryItems(settings) {
  const filePath = path.join(process.cwd(), settings.memoryDir, "long_memory.txt");

  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseMemoryLine);
}

function scoreItem(item, query) {
  const queryWords = tokenize(query.text || query);
  const queryTags = (query.tags || []).map((tag) => tag.toLowerCase());
  const queryCategory = query.category ? query.category.toLowerCase() : null;
  const queryImportance = query.importance ? query.importance.toLowerCase() : null;

  let score = 0;

  for (const word of queryWords) {
    if (item.keywords.includes(word) || item.text.toLowerCase().includes(word)) {
      score += 2;
    }
  }

  for (const tag of queryTags) {
    if (item.tags.includes(tag)) {
      score += 3;
    }
  }

  if (queryCategory && item.category === queryCategory) {
    score += 2;
  }

  if (queryImportance && item.importance === queryImportance) {
    score += 2;
  }

  if (item.importance === "permanent") {
    score += 1;
  }

  return score;
}

function retrieveMemory(settings, query, options = {}) {
  const limit = options.limit || 8;

  return loadMemoryItems(settings)
    .map((item) => ({
      ...item,
      score: scoreItem(item, query),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = {
  loadMemoryItems,
  parseMemoryLine,
  retrieveMemory,
  tokenize,
};
