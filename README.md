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

# settings

設定は config/settings.json を基準にします。
環境ごとの差分は config/settings.local.json で上書きします。

settings.local.json は Git 管理対象外です。
秘密情報や運用環境ごとの差分はここに置きます。

コード側で投稿用・会話用の設定を再生成しません。
実行時の挙動は settings の値だけで決まります。

## generationMode

生成の用途は generationMode で指定します。

- post: X / Discord への時報投稿
- reply: WebUI 会話

投稿運用では、会話履歴やWebUI用プロンプトを投稿生成へ混ぜないため、投稿用の設定を使います。
WebUI会話では、会話履歴や会話例を使う設定にできます。

## 設定例

用途別の例は config/ に分けています。

- config/settings.post.example.json: 投稿用
- config/settings.webchat.example.json: WebUI会話用
- config/settings.example.json: 共通設定の例

投稿用で重要な項目:

```json
{
  "generationMode": "post",
  "enableWebChatPrompt": false,
  "enableRecentChatHistory": false,
  "enableGoodExamples": false,
  "enableBadExamples": false,
  "enableLongMemory": false
}
```

WebUI会話用で重要な項目:

```json
{
  "generationMode": "reply",
  "enableWebChatPrompt": true,
  "enableRecentChatHistory": true,
  "enableGoodExamples": true,
  "enableBadExamples": true,
  "enableAnalyzeInput": true,
  "enableCurrentState": true
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

- [実装仕様書](docs/implementation-spec.md)
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
