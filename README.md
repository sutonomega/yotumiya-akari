# 夜宮 灯 / Yorumiya Akari

静かな時報と会話を行う、ローカル人格AIプロジェクト。

Discord Bot と WebUI を中心に動作し、
ローカルLLMによる自然な発話・記憶・音声合成を行います。

---

# 特徴

- ローカルLLMで動作
- 時報システム
- 長期記憶
- Google Calendar / ICS連携
- private予定 filtering
- phrase repetition suppression
- VOICEVOX対応
- WebUI
- prompts分離構成
- function分離によるモジュール設計
- settings.local.json対応
- 軽量構成を意識した設計
- runtime error handling

---

# 使用技術

- Node.js
- Discord.js
- Express
- Vite
- React
- Ollama
- VOICEVOX
- Google Calendar API
- dotenv
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

## カレンダー連携

Google Calendar / ICS から予定を取得し、
現在の予定や今後の予定を発話へ反映します。

private keyword に一致する予定は
promptへ表示しません。

## 音声合成

VOICEVOXによる音声生成に対応しています。

## Prompt管理

prompts/ 配下で、
用途別にpromptを分離しています。

---

# ディレクトリ構成

```txt
functions/
prompts/
config/
memory/
webui/
```

---

# .env

秘密情報は .env で管理します。

例:

```env
DISCORD_TOKEN=xxxxxxxx
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

# Calendar設定

## Google Calendar

```json
{
  "calendarProvider": "google",
  "googleCalendarUrl": "https://www.googleapis.com/calendar/v3/calendars/..."
}
```

## ICS

```json
{
  "calendarProvider": "ics",
  "calendarIcsUrl": "https://..."
}
```

---

# ドキュメント

- [現在の設計](docs/architecture.md)
- [今後やること](docs/roadmap.md)
- [大きな変更履歴](docs/changelog.md)
- [思いつきメモ](docs/ideas.md)
- [X Bot Design](docs/xbot-design.md)

---

# 開発メモ

## VOICEVOX

VOICEVOX Engine を別途起動してください。

デフォルト:
http://localhost:50021

## Ollama

ローカルLLMは Ollama 経由で利用します。

---

# Runtime Files

以下は runtime state / cache のため
Git 管理対象外です。

```txt
memory/recent_phrases.json
settings.local.json
.env
```

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
