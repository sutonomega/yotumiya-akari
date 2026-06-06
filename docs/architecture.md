# Yorumiya AI Architecture

## 概要

Yorumiya AI は、ローカル LLM を中心にした人格 AI / 時報 bot です。
主な用途は、X または Discord への定期時報投稿と、WebUI 経由の会話です。

設計上の中心は次の 3 つです。

- 状態収集: 現在時刻、気分、会話統計、天気、カレンダーをまとめる。
- 発話生成: prompt、記憶、履歴、状態を組み合わせて LLM へ渡す。
- 投稿先分離: X / Discord / API などの入口は分け、生成処理は共通化する。

## 現在のMVP

現在の主要機能:

- Xへの定期時報投稿
- Discordへの定期投稿
- WebUIからの会話
- ローカルLLM(Ollama)による発話生成

未実装または停止中:

- 動画実況
- 自動イベント検知
- 長期記憶生成
- 会話要約生成

## 全体構成

```txt
bot.js
  -> functions/xBot.js / functions/discordBot.js
       -> scheduler.js
       -> environmentState.js
       -> generateMessage.js
       -> xClient.js / postTarget.js

webChatServer.js
  -> environmentState.js
  -> generateMessage.js
  -> processHistory.js

frontend/
  -> webChatServer.js の /api/chat と /api/feedback を利用
```

主要ディレクトリ:

- `functions/`: bot の主要ロジック。
- `prompts/`: LLM に渡す用途別 prompt。
- `config/`: 共通設定とローカル上書き設定。
- `memory/`: 会話履歴、長期記憶、runtime state、feedback。
- `docs/`: 設計メモ。
- `frontend/`: React / Vite の WebUI。
- `scripts/`: 手動確認用スクリプト。

## 起動入口

### bot.js

`config/settings.json` / `config/settings.local.json` の `postTargets` で投稿先 bot を選びます。
`postTargets` が `["discord"]` の場合は Discord bot、それ以外は X bot が起動します。

```json
{
  "postTargets": ["discord"]
}
```

内部的には次の分岐です。

- `postTargets: ["discord"]`: `functions/discordBot.js`
- それ以外: `functions/xBot.js`

### functions/xBot.js

1分ごとに scheduler を確認し、投稿対象の時刻なら発話を生成して X に渡します。
`settings.xDryRun` または `X_DRY_RUN` が有効な場合、実投稿せず `memory/x_post_state.json` に記録します。

### functions/discordBot.js

Discord client を起動し、ready 後に 1分ごとの scheduler loop を開始します。
投稿先 channel は `settings.channelId` で指定します。

### webChatServer.js

WebUI 会話用の Express server です。常駐 bot ではなく、使う時だけ起動する会話アプリの backend として扱います。`functions/api.js` は互換用の起動 shim です。

`npm run web` で backend と frontend をまとめて起動します。

- backend: `node webChatServer.js`
- frontend: `npm run dev --prefix frontend -- --host 127.0.0.1`

API:

- `GET /`: ヘルスチェック。
- `POST /api/chat`: WebUI 会話。
- `POST /api/feedback`: good / bad feedback を `memory/feedback/` に保存。

## 定期投稿フロー

```txt
functions/xBot.js / functions/discordBot.js
  -> checkScheduler()
  -> getEnvironmentState()
  -> utteranceQueue.enqueue()
  -> generateMessage({ mode: event.mode, currentState, eventPrompt })
  -> speak() optional
  -> postTweet() / postMessage()
```

### scheduler.js

`checkScheduler()` は1分ごとの scheduler loop から呼ばれ、現在時刻と `memory/scheduler.json` を読み、投稿すべきタイミングか判断します。
実際の発火は `lifeRhythm.js` が、現在の `hour` / `minute` と投稿スケジュール設定を見て決めます。
また、深夜処理の実行条件もここで確認します。

### lifeRhythm.js

投稿スロットを定義します。時間帯判定は `getCurrentState()` の `timeText` を使い、`lifeRhythm.js` 側では morning/daytime/evening/night を再判定しません。

投稿頻度は `settings.postScheduleMode` で切り替えます。scheduler は1分ごとに確認しますが、投稿は `postScheduleMinute` と対象時刻に一致した時だけ発火します。

- `hourly`: 現状維持の時報向け。`hourlyPostHours` に含まれる時刻だけ投稿します。
- `daily4`: SNS投稿削減向け。`dailyPostHours` に含まれる朝昼夕夜などの時刻だけ投稿します。
- `custom`: `postScheduleHours` を使って任意の時刻だけ投稿します。

投稿分は `postScheduleMinute` で指定します。既定値は `0` のため、現在の標準運用では対象時刻の毎時0分に発火します。同じスロットの重複投稿は `scheduler.json` の `lastPostTime` で防ぎます。

ESP32 時報機能では `hourly` を使い、SNS 投稿量を減らす運用では `daily4` を使う想定です。

## 会話フロー

```txt
frontend
  -> POST /api/chat
  -> getEnvironmentState({ userMessage })
  -> utteranceQueue.enqueue()
  -> generateMessage({ mode: "reply", userMessage, currentState, settingsOverride })
  -> processHistory()
  -> response json
```

`processHistory()` は会話履歴を保存し、設定が有効な場合だけ summary、long memory、履歴圧縮を実行します。
現在の `settings.json` では summary と long memory generation は無効です。

WebUI 会話では `getEnvironmentState()` で作った `currentState` をそのまま `generateMessage()` に渡します。`enableWebChatAnalyzeInput` と `enableWebChatCurrentState` で、WebUI 会話だけ分析・状態プロンプトを有効化できます。

## 状態収集

### getCurrentState.js

時刻と runtime state をまとめます。

- `hour`, `minute`, `timeText`
- `memory/mood.json`
- `memory/scheduler.json`
- `memory/talk_stats.json`
- 最終会話からの経過時間

### environmentState.js

`getCurrentState()` に次を加えた、発話生成用の統合状態を返します。

- weather: `memory/weather.json` または default weather。
- calendar: `calendarState.js` の結果。
- conversation: 入力文のカテゴリと会話状態。

### calendarState.js / calendarProvider.js

予定の取得元は `settings.calendarProvider` で選びます。

- `local`: `memory/calendar.json`
- `ics` / `icloud`: ICS URL またはローカル ICS file
- `google`: Google Calendar API URL

`calendarState.js` は予定を次の観点で分類し、LLM 用 prompt を作ります。

- 今の予定
- さっき終わった予定
- このあと数時間以内の予定

## 発話生成

中心は `functions/generateMessage.js` です。

```txt
generateMessage()
  -> loadSettings()
  -> getEnvironmentState() if currentState is not supplied
  -> buildSystemPrompt()
  -> parseHistory()
  -> mode-specific user message
  -> runResponsePipeline()
  -> suppressRecentPhrases()
  -> repairTimeSignalPost() for post mode
  -> formatTimeText() for post mode
  -> length limit
  -> saveRecentPhrases()
```

### mode

- `reply`: ユーザー発話への返信。
- `post`: 定期投稿。`prompts/time_signal.txt` を使い、本文先頭に `formatTimeText(hour)` の時刻行を付けます。

深夜停止は `sleep` mode ではなく、現在は `lifeRhythm.js` の投稿対象時刻設定で制御します。

### system prompt

`buildSystemPrompt()` は `prompts/system.txt` と memory ファイルを設定フラグに応じて結合します。

主な入力:

- AI profile / user profile
- current state
- calendar prompt
- long memory
- good / bad examples
- conversation rules


### 時報品質ガード

時報投稿では、LLM の出力をそのまま投稿せず、生成後に `functions/timeSignalSafety.js` で検査します。

処理順:

1. `generateMessage()` が本文候補を生成する。
2. `suppressRecentPhrases()` で直近 phrase を記録・確認する。
3. `repairTimeSignalPost()` が危険語、時刻重複、英字、長さ、具体物の有無を検査する。
4. 危険な場合は `prompts/time_signal_repair.txt` を使って再生成する。
5. 再生成後も危険な場合は `config/time_signal_safety.json` の fallback 文からランダムに選ぶ。
6. fallback が発生した場合は `memory/time_signal_fallbacks.json` に記録する。

時間帯判定は `getCurrentState()` の `timeText` を使います。`timeSignalSafety.js` 側で hour から独自に morning/daytime/evening/night を再判定しません。

主な設定:

- `timeSignalRepairMaxAttempts`: 再生成の最大回数。
- `config/time_signal_safety.json`: 危険語、具体物語彙、時間帯別 fallback 文、fallback log 設定。
- `prompts/time_signal.txt`: 通常生成用 prompt。
- `prompts/time_signal_repair.txt`: 再生成用 prompt。
- `prompts/time_description.txt`: 投稿時刻ごとの短い生成指示。

### responsePipeline.js

生成は段階化されています。

1. `analyzeInput()`: 会話カテゴリと関連 memory を作る。`enableAnalyzeInput=false` の場合は軽量な既定値を返す。
2. `buildBaseReply()`: LLM で下書きまたは最終文を生成する。
3. `personalizeReply()`: 設定が有効な場合だけ、下書きを自然な X 投稿向け日本語に整える。

`sanitizeModelText()` は、`Analysis:` などのメタ出力や Markdown fence が最終出力に混じった場合に除去します。
`buildBaseReply()` と `personalizeReply()` の system prompt はコード直書きではなく、`prompts/response_base_rules.txt` と `prompts/response_personalize.txt` から読み込みます。

### llmProvider.js

`settings.llmProvider` で LLM backend を切り替えます。

- `ollama`: `/api/chat` と `/api/generate` を利用。
- `openai`: `OPENAI_API_KEY` が必要。
- `claude`: `ANTHROPIC_API_KEY` が必要。

Ollama の既定モデルは `settings.chatModel` です。現在の設定例では `qwen2.5:3b` です。
`<think>...</think>` は `stripThinking()` で除去します。

## 投稿先

### X

`functions/xClient.js` が `twitter-api-v2` を使って投稿します。

主な guard:

- 空文字投稿を禁止。
- `settings.xMaxLength` を超える場合は末尾を省略記号で切る。
- `memory/x_post_state.json` の最近投稿と完全一致する重複を禁止。
- 15分あたりの投稿数を `settings.xRateLimitPer15Min` で制限。
- dry-run 時は API を呼ばず、投稿予定文を state に保存。

必要な環境変数:

```env
X_API_KEY=
X_API_KEY_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

### Discord

`functions/discordBot.js` が channel を fetch し、`functions/postTarget.js` 経由で送信します。
`DISCORD_TOKEN` と `settings.channelId` が必要です。

## 記憶と履歴

### 会話履歴

`saveHistory()` が `memory/chat_history.txt` に会話を追記します。
`parseHistory()` は直近履歴を LLM の messages へ戻します。

### summary / long memory

`processHistory()` は設定が有効な場合に次を実行します。

- `summary.js`: 会話ログから要約を生成。
- `longMemory.js`: 要約から長期記憶候補を生成、保存。
- `compressHistory.js`: 会話履歴を上限行数へ圧縮。

### nightly process

`nightlyProcess.js` は既定で 3時に1日1回動きます。

- personality rules の抽出保存。
- long memory の正規化。
- chat history の圧縮。
- `memory/nightly_process.json` への実行記録。

### recent phrases

`recentPhrases.js` は生成文から短い phrase を抽出して `memory/recent_phrases.json` に保存します。
類似度による penalty 計算はありますが、現状の `suppressRecentPhrases()` は文を壊さないため、penalty があっても本文は変更しません。

## 代表的な開発環境例

`config/settings.json` は、軽量な時報投稿と会話を優先した開発向けの基準設定です。
実運用では `config/settings.local.json` や環境変数で上書きされることがあります。

- `llmProvider`: `ollama`
- `chatModel`: `qwen2.5:3b`
- `memoryModel`: `qwen2.5:3b`
- `summaryModel`: `qwen2.5:3b`
- `xDryRun`: `true`。開発環境の例。実投稿する運用では `false` に変更される。
- `postScheduleMode`: `hourly`。SNS投稿を減らす場合は `daily4` に変更する。
- `postScheduleMinute`: `0`。投稿する分。既定では対象時刻の毎時0分に発火する。
- `hourlyPostHours`: ESP32時報などの毎時出力向け投稿時刻。
- `dailyPostHours`: SNS向けの朝昼夕夜などの投稿時刻。
- `enableAnalyzeInput`: `false`
- `enableBaseReply`: `true`
- `enablePersonalizeReply`: `false`
- `enableCurrentState`: `false`
- `enableCalendarPrompt`: `false`
- `enableLongMemory`: `false`
- `enableSummary`: `false`
- `enableLongMemoryGeneration`: `false`

## 設定

設定は `config/settings.json` を基準に、存在する場合は `config/settings.local.json` で上書きします。
`settings.local.json` は環境ごとの非公開設定として扱います。

重要な設定:

- `chatModel`, `memoryModel`, `summaryModel`: 用途別 LLM model。
- `llmProvider`, `ollamaBaseUrl`: LLM backend。
- `memoryDir`: runtime state と memory の保存先。
- `replyMaxLength`: 最終出力の上限。
- `calendarProvider`: calendar backend。
- `xDryRun`, `xMaxLength`, `xRateLimitPer15Min`: X 投稿制御。
- `postScheduleMode`, `postScheduleMinute`, `hourlyPostHours`, `dailyPostHours`, `postScheduleHours`: 定期投稿スケジュール制御。
- `enableAnalyzeInput`, `enableBaseReply`, `enablePersonalizeReply`: response pipeline の段階制御。
- `timeSignalRepairMaxAttempts`: 時報生成後の危険語検出に対する再生成回数。
- `enableCurrentState`, `enableCalendarPrompt`, `enableLongMemory`: system prompt に含める情報の制御。
- `enableSummary`, `enableLongMemoryGeneration`: 履歴処理の生成系制御。

## 外部化されたプロンプトと辞書

運用で調整する文言、危険語、分類語彙は、コード直書きではなく `prompts/` または `config/` に置きます。

主な prompt files:

- `prompts/system.txt`: 基本 system prompt。
- `prompts/time_signal.txt`: 時報生成 prompt。
- `prompts/time_signal_repair.txt`: 時報再生成 prompt。
- `prompts/time_description.txt`: 投稿時刻ごとの短い生成指示。
- `prompts/response_base_rules.txt`: response pipeline の base reply 出力制約。
- `prompts/response_personalize.txt`: personalize reply の整形指示。
- `prompts/summary.txt`, `prompts/memory_summary.txt`: 要約・長期記憶生成用 prompt。

主な config files:

- `config/time_signal_safety.json`: 時報の危険語、具体物語彙、時間帯別 fallback 文。
- `config/conversation_category.json`: 会話カテゴリ、分類 signal、カテゴリ別指示文。
- `config/personality_rules.json`: feedback から人格ルールを抽出するための signal と出力ルール。
- `config/long_memory_safety.json`: 長期記憶正規化時の NG ワードと閾値。

コード側は、これらのファイルを読み込み、判定・整形・LLM 呼び出しだけを担当します。

設定系 JSON はプロセス内で初回読み込み後にキャッシュします。運用中にファイルを変更した場合は bot を再起動するか、該当 module の `reload...Config()` を明示的に呼びます。

## runtime files

`memory/` 配下には、人格情報と runtime state が混在します。

人格・記憶系:

- `ai_profile.txt`
- `user_profile.txt`
- `conversation_rules.txt`
- `long_memory.txt`
- `feedback/good_examples.txt`
- `feedback/bad_examples.txt`
- `chat_history.txt`

状態・cache 系:

- `scheduler.json`
- `mood.json`
- `talk_stats.json`
- `weather.json`
- `calendar.json`
- `recent_phrases.json`
- `time_signal_fallbacks.json`
- `x_post_state.json`
- `nightly_process.json`

秘密情報や個人情報を含み得るため、`.env`、`config/settings.local.json`、runtime state は公開リポジトリへ入れない方針です。

## dry-run と確認

時報本文だけの確認:

```bash
npm run test:time-post -- 21
```

X 実投稿直前の確認:

```json
{
  "xDryRun": true,
  "chatModel": "qwen2.5:3b"
}
```

確認観点:

- 先頭に時刻行が付く。
- 本文側に時刻が重複しない。
- `Analysis:` などのメタ出力が残らない。
- X 文字数上限に収まる。
- `memory/x_post_state.json` に dry-run の記録が残る。
- 重複投稿 guard と rate limit guard が意図通り働く。

## エラーハンドリング方針

- 投稿 loop の例外は bot を落とさず console に出す。
- LLM 生成失敗時は `settings.defaultMessage` を返す。
- calendar fetch 失敗や timeout は空予定として扱う。
- X 投稿は credential 不足、重複、rate limit、空文を例外として止める。

## 拡張方針

既存設計では、投稿先、状態収集、生成、記憶を分離しています。
新しい機能は次の境界に合わせると影響範囲を抑えられます。

- 投稿先追加: `generateMessage()` の後ろに adapter を追加する。
- 状態追加: `environmentState.js` に state を追加し、`statePrompt.js` で prompt 化する。
- prompt 改善: `prompts/` と `config/` の外部ファイルを調整する。コードへプロンプトや辞書を直書きしない。
- 記憶改善: `processHistory()`、`longMemory.js`、`memoryRetrieval.js` の範囲で扱う。
- UI 改善: `frontend/` と `webChatServer.js` の API 境界を維持する。


## 開発ルール

- 設定値は `config/settings.json` を基準にし、環境差分は `config/settings.local.json` で上書きする。
- 秘密情報は `.env` に保存する。
- テスト用スクリプトは `scripts/` に配置する。
- 新機能は `functions/` に追加し、`bot.js` を肥大化させない。

## Codex利用時の推奨手順

1. この `architecture.md` を読む。
2. 現在の `config/settings.json` と、存在する場合は `config/settings.local.json` を確認する。
3. 修正前に変更方針を説明する。
4. `scripts/` のテストで動作確認する。
5. `git diff` を確認してからコミットする。

