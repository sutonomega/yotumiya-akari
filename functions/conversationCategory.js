const CATEGORIES = Object.freeze([
  "technical",
  "emotional",
  "casual",
  "sleepy",
  "playful",
]);

const RULES = [
  {
    category: "technical",
    pattern: /コード|実装|エラー|API|bug|deploy|github|node|react|設定/i,
  },
  {
    category: "emotional",
    pattern: /つらい|悲しい|不安|疲れた|寂しい|泣|しんどい|こわい/i,
  },
  {
    category: "sleepy",
    pattern: /眠い|寝る|おやすみ|深夜|夜更かし|sleep/i,
  },
  {
    category: "playful",
    pattern: /笑|www|冗談|遊|かわいい|にゃ|ふふ|haha/i,
  },
];

function classifyConversation(message, currentState = {}) {
  const text = String(message || "");

  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return rule.category;
    }
  }

  if (currentState.hour >= 0 && currentState.hour < 6) {
    return "sleepy";
  }

  return "casual";
}

function categoryInstruction(category) {
  switch (category) {
    case "technical":
      return "技術相談として、手順と判断理由を短く整理して返す。";
    case "emotional":
      return "感情を受け止めて、急がず穏やかに返す。";
    case "sleepy":
      return "眠気や夜の静けさを尊重して、短く落ち着いた返事にする。";
    case "playful":
      return "軽さと遊び心を少し入れつつ、過剰に崩しすぎない。";
    default:
      return "自然な雑談として、相手の文脈に沿って返す。";
  }
}

module.exports = {
  CATEGORIES,
  categoryInstruction,
  classifyConversation,
};
