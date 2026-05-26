const CATEGORIES = Object.freeze([
  "technical",
  "emotional",
  "casual",
  "sleepy",
  "playful",
]);

const CATEGORY_SIGNALS = Object.freeze({
  technical: [
    /コード|実装|エラー|API|bug|deploy|github|node|react|設定/i,
    /修正|関数|ファイル|ログ|JSON|provider|scheduler/i,
  ],
  emotional: [
    /つらい|悲しい|不安|疲れた|寂しい|泣|しんどい|こわい/i,
    /大丈夫|助けて|もう無理|落ち込/i,
  ],
  sleepy: [
    /眠い|寝る|おやすみ|深夜|夜更かし|sleep/i,
    /朝まで|布団|まぶた/i,
  ],
  playful: [
    /笑|www|冗談|遊ぼ|ふふ|haha/i,
    /かわいい[ねな！!？?]*$|好きすぎ|ノリ/i,
  ],
});

function scoreCategory(text, category) {
  const signals = CATEGORY_SIGNALS[category] || [];

  return signals.reduce((score, pattern) => {
    return pattern.test(text) ? score + 1 : score;
  }, 0);
}

function classifyConversation(message, currentState = {}) {
  const text = String(message || "");
  const scores = Object.fromEntries(
    CATEGORIES.map((category) => [category, scoreCategory(text, category)]),
  );

  if (currentState.hour >= 0 && currentState.hour < 6) {
    scores.sleepy += 1;
  }

  if (scores.playful === 1 && scores.technical > 0) {
    scores.playful -= 1;
  }

  const [bestCategory, bestScore] = Object.entries(scores).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return bestScore > 0 ? bestCategory : "casual";
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
  scoreCategory,
};
