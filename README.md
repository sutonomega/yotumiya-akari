# 夜宮 灯 / Yorumiya Akari

静かな時報と会話を行う、ローカル人格AIプロジェクト。

Discord Bot と WebUI を中心に動作し、
ローカルLLMによる自然な発話・記憶・音声合成を行います。

---

# 特徴

- ローカルLLMで動作
- 時報システム
- 長期記憶
- VOICEVOX対応
- WebUI
- prompts分離構成
- function分離によるモジュール設計
- settings.local.json対応
- 軽量構成を意識した設計

---

# 使用技術

- Node.js
- Discord.js
- Express
- Vite
- React
- Ollama
- VOICEVOX
- qwen3:1.7b

---

# 現在の機能

## 時報

1時間ごとに、
静かな時報メッセージを投稿します。

## 会話

WebUI経由で自然な会話を行います。

## 長期記憶

会話履歴から重要な内容を抽出し、
long_memory.txtへ保存します。

## 音声合成

VOICEVOXによる音声生成に対応しています。

## Prompt管理

prompts/ 配下で、
用途別にpromptを分離しています。

---

# ディレクトリ構成

```txt
functions/
├ compressHistory.js
├ generateMessage.js
├ getCurrentState.js
├ loadJson.js
├ loadSettings.js
├ logger.js
├ longMemory.js
├ parseHistory.js
├ processHistory.js
├ saveHistory.js
├ saveMood.js
├ savePostCandidate.js
├ saveTalkStats.js
├ scheduler.js
├ speak.js
├ summary.js
├ updateMood.js
└ updateTalkStats.js

prompts/
├ memory_summary.txt
├ summary.txt
├ system.txt
└ time_signal.txt

config/
├ settings.json
├ settings.local.json
└ settings.example.json
```

---

# settings.local.json

環境ごとの差分設定は
settings.local.json で上書きできます。

このファイルは Git 管理対象外です。

例:

```json
{
  "enableVoice": true
}
```

---

# 開発メモ

## VOICEVOX

VOICEVOX Engine を別途起動してください。

デフォルト:
http://localhost:50021

## Ollama

ローカルLLMは Ollama 経由で利用します。

---

# 今後やりたいこと

- ESP32移植
- スピーカーデバイス化
- 季節・天気連動
- memory整理最適化
- 発話queue制御
- モデル切り替え強化
- UI改善

---

# 注意

.env や memory フォルダ内の個人データ、
settings.local.json は GitHub にアップロードしないでください。
