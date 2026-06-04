# テスト仕様書

## 目的

Yorumiya の既存機能に対して、機能追加時のデグレを検知するための自動テストと、目視確認が必要な dry-run テストの内容を整理する。

## 実行コマンド

- `npm run test:unit`
  - `test/**/*.test.js` を Node.js の test runner で実行する。
  - 外部 API への実通信は行わず、必要な箇所は mock や dry-run を使う。
- `npm run test:time-post`
  - `scripts/test-time-post.js` を使って時報生成を dry-run する。
  - `TEST_TIME_POST_HOUR=21` で午後9時相当の投稿生成を確認する。
  - `recent_phrases.json` と `time_signal_fallbacks.json` はデフォルトで snapshot/restore される。
- `npm test`
  - `npm run test:unit` と `npm run test:time-post` を順に実行する。
- `npm run test:coverage`
  - Node.js の experimental coverage を使ってカバレッジを確認する。

## 目視確認ログ

時報 dry-run の結果は `test/log/time-post.txt` に追記される。

確認観点:

- 投稿本文が自然な日本語になっているか
- `Analysis` などの分析ラベルが本文に混入していないか
- 時刻本文と投稿時刻が矛盾していないか
- フォールバックが発生した場合でも投稿文として不自然でないか

## テスト一覧

### `test/calendarProvider.test.js`

対象:

- `functions/calendarProvider.js`

確認内容:

- Google Calendar API URL に既存 query を保持したまま `singleEvents=true` を付与する
- `orderBy=startTime` を付与して時系列順取得にする
- `timeMin` / `timeMax` を付与して、直近終了予定から今後の予定までの範囲に絞る
- `calendarMaxResults` による取得件数制限を付与する
- Google Calendar の mock response を予定データへ normalize する
- 外部 Google API への実通信は行わない

### `test/conversationCategory.test.js`

対象:

- `functions/conversationCategory.js`

確認内容:

- 技術相談文が `technical` に分類される
- 感情表現を含む文が `emotional` に分類される
- 深夜帯では `sleepy` のバイアスが加算される
- カテゴリ別 instruction が設定ファイルから読み込まれる
- カテゴリ設定が cache され、reload で再読み込みされる
- `technical` と `playful` が同時に反応した場合、技術相談を優先する

### `test/lifeRhythm.test.js`

対象:

- `functions/lifeRhythm.js`

確認内容:

- `hourly` モードで `hourlyPostHours` が使われる
- `daily4` モードで `dailyPostHours` が使われる
- `custom` モードで `postScheduleHours` が使われる
- 投稿は設定された分と対象時間が一致した場合だけ発火する
- 同一 `currentSlot` は重複投稿として抑止される
- `currentState.timeText` をもとに時報種別が作られる
- 午前6時は `good_morning`、午後10時は `good_night` として扱われる

### `test/responsePipeline.test.js`

対象:

- `functions/responsePipeline.js`

確認内容:

- モデル出力に含まれる `Analysis` などの分析ラベルが除去される
- personalize が無効な場合、base reply を sanitize して返す
- analyze が無効な場合、既定カテゴリ `casual` として pipeline が動作する
- analyze が有効な場合、会話カテゴリと長期記憶が取得される
- base reply が無効な場合、空文字を返す
- personalize が有効な場合、モデル呼び出し結果を sanitize して返す

### `test/timeSignalSafety.test.js`

対象:

- `functions/timeSignalSafety.js`

確認内容:

- `currentState.timeText` から時間帯を判定する
- `timeText` がない場合は `night` を既定値にする
- `Analysis`、ASCII 文字、本文内時刻、具体物不足を危険として検出する
- 時間帯に合わない語句を `time_mismatch` として検出する
- 安全な具体文は通過する
- 時間帯別 fallback が選択される
- 時間帯別 fallback がない場合は default fallback が使われる
- 危険文は再生成を試み、失敗または危険継続時に fallback へ落ちる
- fallback 発生時に `time_signal_fallbacks.json` へ履歴が残る
- 再生成が安全文を返した場合は fallback しない
- 再生成関数が例外を出した場合、その理由を記録して fallback する
- safety 設定の cache と reload が動作する
- 天候情報が不明な場合、雨・晴れ・曇り・雪・風などの天候断定語を危険として検出する
- 天候情報が取得済みの場合は、天候語だけを理由に危険扱いしない

### `test/llmProvider.test.js`

対象:

- `functions/llmProvider.js`

確認内容:

- `<think>...</think>` ブロックが除去される
- debug 用 message prompt が role/content 形式で結合される
- Ollama chat が `/api/chat` に正しい payload を送る
- Ollama chat の不正レスポンスで例外を返す
- Ollama generate が `/api/generate` に正しい payload を送る
- Ollama generate の error レスポンスで例外を返す
- OpenAI chat は mock fetch で API 形式と応答処理を確認する
- OpenAI provider は API key 未設定時に例外を返す
- Claude chat は mock fetch で API 形式と応答処理を確認する
- Claude provider は API key 未設定時に例外を返す
- Ollama 以外の generate は chat 経由へ委譲される

補足:

- 現在の主運用は Ollama なので、Ollama 経路を重点確認する。
- OpenAI / Claude は実通信せず、mock fetch による分岐確認に留める。

### `test/memoryRetrieval.test.js`

対象:

- `functions/memoryRetrieval.js`

確認内容:

- tokenize が英数字を小文字化し、記号を除去して単語化する
- memory 行から category、importance、tag、keyword が抽出される
- 長期記憶ファイルがない場合は空配列を返す
- text、tag、category、importance、permanent boost によるスコアリングで関連記憶が取得される

### `test/historyRecentPostTarget.test.js`

対象:

- `functions/parseHistory.js`
- `functions/recentPhrases.js`
- `functions/postTarget.js`

確認内容:

- 履歴テキストから user / assistant メッセージを抽出する
- 空行、空メッセージ、句読点だけの assistant メッセージを除外する
- assistant の繰り返し文を除外する
- `recentChatLines` に従って履歴件数を制限する
- parse 失敗時は空配列を返す
- recent phrases を保存し、重複スコアを計算する
- AI名を含む文は重複ペナルティ対象から除外する
- `suppressRecentPhrases` は現状メッセージを破壊せず返す
- 投稿先は `postTargets`、`postTarget`、既定値 `discord` の順で解決される
- retry は成功まで再試行し、上限到達時は最後の例外を返す
- Discord 投稿は mock channel で送信処理を確認する
- X 投稿は dry-run で外部 API なしに確認する
- Discord channel がない場合は投稿を skip する

### `test/xClient.test.js`

対象:

- `functions/xClient.js`

確認内容:

- X 投稿本文を trim する
- 空本文を例外にする
- 最大長を超えた本文を省略記号付きで短縮する
- OAuth 環境変数が不足している場合に例外を返す
- OAuth 環境変数が揃っている場合に credential を構築する
- `X_DRY_RUN` 環境変数が settings より優先される
- 投稿履歴を保存し、直近重複を検出する
- 15分あたり投稿数制限を検出する
- dry-run 投稿では外部 API を呼ばず履歴だけ記録する
- 重複投稿と rate limit を抑止する
- 実投稿相当の経路は injected client で確認する

### `test/storageAndFormatting.test.js`

対象:

- `functions/timeFormatter.js`
- `functions/loadJson.js`
- `functions/stateStore.js`

確認内容:

- 0時、9時、12時、21時の時刻表記を確認する
- JSON ファイルが存在しない場合は default value を返す
- JSON が壊れている場合も default value を返す
- memory path の組み立てを確認する
- state の read / write / update ができる
- memory file への append ができる
- 天候情報が不明な場合、state prompt に天候を断定しない制約が入る
- 天候情報が取得済みの場合、state prompt に不明時の制約を入れない

### `test/loadSettingsLogger.test.js`

対象:

- `functions/loadSettings.js`
- `functions/logger.js`

確認内容:

- `settings.local.json` が `settings.json` を上書きする
- logger が type を大文字正規化して出力する
- logger helper の `system` が使える
- meta 情報が JSON としてログ行に含まれる
- type 未指定時は `INFO` になる

注意:

- `settings.local.json` と `logs/app.log` はテスト内で snapshot/restore する。

### `test/testTimePostScript.test.js`

対象:

- `scripts/test-time-post.js`

確認内容:

- `YORUMIYA_TEST_PRESERVE_MEMORY` が未指定の場合、memory 保護が有効になる
- `YORUMIYA_TEST_PRESERVE_MEMORY=1` でも memory 保護が有効になる
- `YORUMIYA_TEST_PRESERVE_MEMORY=0` の場合だけ memory 保護を無効化する
- `recent_phrases.json` と `time_signal_fallbacks.json` の snapshot/restore が既存ファイルと未存在ファイルの両方で動作する
- 目視確認用ログを任意の log path に書き出せる

## 結合・目視テスト

### 時報 dry-run

コマンド:

```bash
npm run test:time-post
```

確認内容:

- 実投稿は行わず、時報生成処理を実行する
- 現在は `TEST_TIME_POST_HOUR=21` に固定し、午後9時の出力を確認する
- 生成結果は標準出力と `test/log/time-post.txt` に残る
- memory 更新はデフォルトで snapshot/restore される

保護を無効化する場合:

```bash
YORUMIYA_TEST_PRESERVE_MEMORY=0 node scripts/test-time-post.js
```

任意時刻で確認する場合:

```bash
TEST_TIME_POST_HOUR=8 node scripts/test-time-post.js
```

## テストデータと副作用

- 一時ファイルは原則 `tmp/` 配下へ作成し、各テスト終了時に削除する。
- `tmp/test-memory` のような固定サブディレクトリは残さない。
- memory 系ファイルに触る dry-run は snapshot/restore を行う。
- X / Discord / OpenAI / Claude への実通信は単体テストでは行わない。
- 目視確認が必要な dry-run 結果だけ `test/log/` に残す。
