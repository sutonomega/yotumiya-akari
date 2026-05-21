const fs = require("fs");

async function summarizeMemory() {
  let recentMemory = "";
  let longMemory = "";

  if (fs.existsSync("memory/long_memory.txt")) {
    longMemory = fs.readFileSync("memory/long_memory.txt", "utf-8");
  }
  if (fs.existsSync("memory/chat_history.txt")) {
    recentMemory = fs.readFileSync("memory/chat_history.txt", "utf-8");
  }

  const response = await fetch("http://127.0.0.1:11434/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5:1.5b",
      stream: false,
      think: false,
    
      messages: [
        {
          role: "system",
          content: `
あなたは記憶整理AIです。

以下の「既存の長期記憶」と「会話履歴」を読み、
長期的に重要な情報を整理してください。

目的：
- long_memory.txt を更新すること
- 古い重要記憶を維持する
- 新しい重要情報を追加する
- 重複を整理する

重要ルール：
- 推測禁止
- 想像禁止
- 会話に存在しない内容は禁止
- 不明な情報を書かない

対象：
- ガルパチについての長期的特徴
- 趣味
- 活動
- 好み
- 継続していること
- AIとの関係性

出力形式：
- 箇条書き
- 「ガルパチは〜」形式
- 簡潔に書く
`,
        },
        {
          role: "user",
          content: `
【既存の長期記憶】
${longMemory}

【会話履歴】
${recentMemory}
`,
        },
      ],
    }),
  });

  const data = await response.json();

  const summary = data.message.content;

  //debug
  // console.log(summary);

  fs.writeFileSync("memory/long_memory.txt", summary);
}

summarizeMemory();
