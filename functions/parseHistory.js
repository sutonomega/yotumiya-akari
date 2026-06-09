function createNgrams(text, n = 2) {
  const normalized = String(text || "").trim();

  // =========================
  // short text
  // =========================

  if (normalized.length < n) {
    return [normalized];
  }

  // =========================
  // ngrams
  // =========================

  const grams = [];

  for (let i = 0; i <= normalized.length - n; i++) {
    grams.push(normalized.slice(i, i + n));
  }

  return grams;
}

function similarity(a, b) {
  const left = new Set(createNgrams(a));

  const right = new Set(createNgrams(b));

  // =========================
  // empty
  // =========================

  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  // =========================
  // hit count
  // =========================

  let hit = 0;
  for (const gram of left) {
    if (right.has(gram)) {
      hit += 1;
    }
  }

  // =========================
  // similarity
  // =========================

  return hit / Math.max(left.size, right.size);
}

function phraseRepetitionScore(content, previousAssistantMessages) {
  if (previousAssistantMessages.length === 0) {
    return 0;
  }

  const recent = previousAssistantMessages.slice(-12);
  const maxSimilarity = Math.max(
    ...recent.map((message) => similarity(content, message)),
  );

  return maxSimilarity;
}

function fixedPhraseScore(content) {
  const trimmed = String(content || "").trim();
  const repeatedChars = /(.)\1{4,}/.test(trimmed) ? 1 : 0;
  const punctuationOnly = /^[\s。、！？!?…ー~]+$/.test(trimmed) ? 1 : 0;
  const hasMeaningfulText = /[\p{L}\p{N}]/u.test(trimmed) ? 0 : 1;

  return repeatedChars + punctuationOnly + hasMeaningfulText;
}

function shouldKeepAssistantMessage(content, previousAssistantMessages) {
  const trimmed = String(content || "").trim();

  // =========================
  // empty
  // =========================

  if (!trimmed) {
    return false;
  }

  // =========================
  // scores
  // =========================

  const fixedScore = fixedPhraseScore(trimmed);
  const repetitionScore = phraseRepetitionScore(
    trimmed,
    previousAssistantMessages,
  );

  // =========================
  // fixed phrase
  // =========================

  if (fixedScore >= 2) {
    return false;
  }

  // =========================
  // repetition
  // =========================

  if (repetitionScore >= 0.6) {
    return false;
  }

  return true;
}

function pushHistoryMessage({ messages, assistantMessages, role, content }) {
  const trimmed = String(content || "").trim();

  if (!trimmed) {
    return;
  }

  if (role === "assistant") {
    if (!shouldKeepAssistantMessage(trimmed, assistantMessages)) {
      return;
    }

    assistantMessages.push(trimmed);
  }

  messages.push({
    role,
    content: trimmed,
  });
}

function parseHistory(settings, historyText) {
  try {
    if (!settings || !settings.userName || !settings.aiName) {
      return [];
    }

    const lines = String(historyText || "").split("\n");
    const messages = [];
    const assistantMessages = [];
    let pendingRole = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      // =========================
      // empty
      // =========================

      if (!line) {
        continue;
      }

      // =========================
      // user
      // =========================

      if (line.startsWith(`${settings.userName}:`)) {
        const content = line.replace(`${settings.userName}:`, "").trim();

        if (content) {
          pushHistoryMessage({
            messages,
            assistantMessages,
            role: "user",
            content,
          });
          pendingRole = null;
        } else {
          pendingRole = "user";
        }

        continue;
      }

      // =========================
      // assistant
      // =========================

      if (line.startsWith(`${settings.aiName}:`)) {
        const content = line.replace(`${settings.aiName}:`, "").trim();

        if (content) {
          pushHistoryMessage({
            messages,
            assistantMessages,
            role: "assistant",
            content,
          });
          pendingRole = null;
        } else {
          pendingRole = "assistant";
        }

        continue;
      }

      if (pendingRole) {
        pushHistoryMessage({
          messages,
          assistantMessages,
          role: pendingRole,
          content: line,
        });
        pendingRole = null;
      }
    }

    // =========================
    // recent
    // =========================

    return messages.slice(-settings.recentChatLines);
  } catch (error) {
    console.log("[PARSE HISTORY ERROR]", error);
    return [];
  }
}

module.exports = parseHistory;
