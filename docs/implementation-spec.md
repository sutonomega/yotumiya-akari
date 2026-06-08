# 実装仕様書

この文書は、現在の Yorumiya Akari の実装仕様をまとめるものです。
要求や将来案は `docs/roadmap.md`、設計の詳細は `docs/architecture.md` に分けます。

## 現在のMVP

現在の主要機能:

- X / Discord への定期時報投稿
- WebUI からの会話
- ローカルLLM(Ollama)による発話生成
- 時報生成後の安全性チェックと fallback
- 会話履歴の保存

未実装または停止中:

- 動画実況
- 自動イベント検知
- 長期記憶生成の実運用
- 会話要約生成の実運用
- 生活ログ連携

## 機能区分

実装上の機能は、投稿のみで使う機能、会話のみで使う機能、両方で使う機能に分かれます。

| 区分 | 主な機能 |
| --- | --- |
| 投稿のみ | スケジューラ、時報生成、時報安全性チェック、fallback、X/Discord投稿、X dry-run |
| 会話のみ | WebUI API、会話用プロンプト、ユーザー入力分析、会話履歴保存、feedback例の利用 |
| 共通 | settings、LLM provider、環境状態取得、response pipeline、prompt読込、runtime state、ログ |

## 設定仕様

設定は `config/settings.json` を基準にします。
環境ごとの差分は `config/settings.local.json` で上書きします。

`settings.local.json` は Git 管理対象外です。
秘密情報や個別環境の設定はここに置きます。

コード側で投稿用・会話用の設定を再生成しません。
実行時の挙動は settings の値だけで決まります。

用途別の設定例:

- `config/settings.post.example.json`: 投稿用
- `config/settings.webchat.example.json`: WebUI会話用
- `config/settings.example.json`: 共通設定の例

### generationMode

生成用途は `generationMode` で指定します。

- `post`: X / Discord への時報投稿
- `reply`: WebUI 会話

投稿と会話は同時起動しない想定です。
運用対象に合わせて `settings.local.json` で `generationMode` と関連フラグを切り替えます。

### 投稿用の主要設定

投稿では、WebUI会話の履歴や例文を生成へ混ぜない設定にします。

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

### WebUI会話用の主要設定

WebUI会話では、会話用プロンプト、直近履歴、会話例、状態分析を利用できます。

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

## 投稿のみで使う機能

### 投稿起動

投稿処理は `functions/xBot.js` または `functions/discordBot.js` から起動します。

1. `functions/scheduler.js` が1分ごとに現在時刻を確認する。
2. `functions/lifeRhythm.js` が投稿対象時刻か判定する。
3. 対象時刻の場合、`generateMessage()` で時報本文を生成する。
4. 時報本文に時刻表記を付ける。
5. `postTargets` に応じて X / Discord へ投稿する。

投稿先:

- `postTargets: ["x"]`: X 投稿
- `postTargets: ["discord"]`: Discord 投稿
- `postTargets: ["x", "discord"]`: 両方へ投稿

X は `xDryRun` または `X_DRY_RUN` が有効な場合、実投稿せず dry-run として記録します。

### 投稿スケジュール

スケジューラは1分ごとに確認します。
実際の投稿は `postScheduleMinute` と対象時刻が一致した場合だけ発火します。

主な設定:

- `postScheduleMode: "hourly"`: `hourlyPostHours` を使う
- `postScheduleMode: "daily4"`: `dailyPostHours` を使う
- `postScheduleMode: "custom"`: `postScheduleHours` を使う
- `postScheduleMinute`: 投稿する分

代表設定:

```json
{
  "postScheduleMode": "hourly",
  "postScheduleMinute": 0,
  "hourlyPostHours": [0, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
  "dailyPostHours": [6, 12, 18, 22]
}
```

### 時報生成

時報生成は `prompts/time_signal.txt` を使います。
時刻そのものは投稿時に別途付与するため、LLMには本文だけを生成させます。

投稿モードでは、生成後に `functions/timeSignalSafety.js` が本文を検査します。

検査対象:

- Analysis などのメタ出力
- 時刻表現の重複
- ASCII文字
- 丁寧語や会話応答調
- 危険語
- 時間帯に合わない語句
- 具体物がない文
- 直近で多用された具体物

異常があれば `timeSignalRepairMaxAttempts` の回数だけ再生成します。
それでも不適切な場合は時間帯別 fallback 文から選びます。

fallback 発生時は `memory/time_signal_fallbacks.json` に記録します。
記録には元の文、理由、fallback文、時刻が含まれます。

## 会話のみで使う機能

### WebUI会話

WebUI会話は `webChatServer.js` が提供します。

1. frontend から `/api/chat` にメッセージを送る。
2. `getEnvironmentState()` で現在状態を作る。
3. `generateMessage()` で返答を生成する。
4. `processHistory()` で会話履歴を保存する。
5. JSON で返答を返す。

WebUI会話は常駐前提ではなく、使うときに起動する想定です。

### 会話用プロンプト

`enableWebChatPrompt` が有効な場合、`prompts/web_chat.txt` を system prompt に含めます。

`enableRecentChatHistory` が有効な場合、`memory/chat_history.txt` から直近履歴を読み込みます。
`parseHistory()` は、保存済みの2行形式にも対応しています。

`enableGoodExamples` / `enableBadExamples` が有効な場合、`memory/feedback/` の例を system prompt に含めます。

### 会話履歴

会話履歴は `memory/chat_history.txt` に保存します。
`processHistory()` は `generationMode: "reply"` の場合だけ履歴保存を行います。

`enableSummary` と `enableLongMemoryGeneration` が有効な場合、会話履歴から summary と long memory を生成します。
現在の代表設定ではどちらも無効です。

## 両方で使う機能

### LLM provider

現在の代表設定:

- `llmProvider`: `ollama`
- `chatModel`: `qwen2.5:3b`
- `memoryModel`: `qwen2.5:3b`
- `summaryModel`: `qwen2.5:3b`

OpenAI / Claude provider のコードはありますが、現状の主運用は Ollama です。

### response pipeline

`generateMessage()` は投稿と会話の両方で使います。

主な処理:

1. settings を読み込む。
2. `generationMode` に応じて投稿か会話かを判定する。
3. settings の各フラグに応じて system prompt を組み立てる。
4. LLM provider を呼び出す。
5. 出力から Analysis などのメタ行を除去する。
6. `recent_phrases.json` に phrase を保存する。
7. 投稿モードの場合だけ時報安全性チェックを行う。

### 環境状態

`getEnvironmentState()` は投稿と会話の両方で使います。
現在時刻、時間帯、カレンダー、会話カテゴリなどをまとめます。

### 重複抑制

`functions/recentPhrases.js` は生成文から phrase を抽出し、`memory/recent_phrases.json` に保存します。

現在の `suppressRecentPhrases()` は本文を壊さずそのまま返します。
ただし、時報安全性チェックでは直近 phrase を参照し、同一文や具体物の偏りを検出します。

### Runtime state

主な runtime ファイル:

- `memory/chat_history.txt`
- `memory/recent_phrases.json`
- `memory/time_signal_fallbacks.json`
- `memory/scheduler.json`
- `memory/x_post_state.json`
- `memory/talk_stats.json`

これらは Git 管理対象外です。

## テスト仕様

テスト仕様の詳細は `docs/test-spec.md` にまとめます。

主要コマンド:

```sh
npm run test:unit
npm run test:time-post
```

`test:time-post` は現在の settings をそのまま使います。
投稿確認をする場合は、投稿用 settings が有効な状態で実行します。
