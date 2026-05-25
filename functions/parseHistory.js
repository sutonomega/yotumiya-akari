function similarity(a, b) {
  const left = new Set(String(a || "").split(""));
  const right = new Set(String(b || "").split(""));

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

  if (!trimmed) {
    return false;
  }

  const fixedScore = fixedPhraseScore(trimmed);
  const repetitionScore = phraseRepetitionScore(trimmed, previousAssistantMessages);

  if (fixedScore >= 2) {
    return false;
  }

  if (repetitionScore >= 0.9) {
    return false;
  }

  return true;
}

function parseHistory(settings, historyText) {
  try {
    const lines = String(historyText || "").split("\n");
    const messages = [];
    const assistantMessages = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      if (line.startsWith(`${settings.userName}:`)) {
        messages.push({
          role: "user",
          content: line.replace(`${settings.userName}:`, "").trim(),
        });
        continue;
      }

      if (line.startsWith(`${settings.aiName}:`)) {
        const content = line.replace(`${settings.aiName}:`, "").trim();

        if (!shouldKeepAssistantMessage(content, assistantMessages)) {
          continue;
        }

        assistantMessages.push(content);
        messages.push({
          role: "assistant",
          content,
        });
      }
    }

    return messages.slice(-settings.recentChatLines);
  } catch (error) {
    console.log("[PARSE HISTORY ERROR]", error);
    return [];
  }
}

module.exports = parseHistory;
