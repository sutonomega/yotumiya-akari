# X Bot Design

## Purpose

現在の `bot.js` は Discord に定期投稿する bot として動いている。

X 投稿へ移行する時は、既存の定期実行・状態取得・文章生成の仕組みは残し、投稿先だけを差し替えられる構成にする。

## Direction

`bot.js` を薄い entry point にし、Discord 用 bot と X 用 bot を分ける。

```txt
bot.js
  -> discordBot.js
  -> xBot.js
```

推奨ファイル名:

- `bot.js`: 起動対象を選ぶ entry point。
- `discordBot.js`: 既存の Discord 定期投稿 bot。
- `xBot.js`: 新しい X 定期投稿 bot。

`discord.js` というファイル名は npm package の `discord.js` と紛らわしいため避ける。

## Runtime Flow

### Shared Flow

Discord と X の両方で、次の処理は共通にする。

```txt
checkScheduler()
  -> getEnvironmentState()
  -> generateMessage()
  -> post adapter
```

共通利用する既存 module:

- `functions/scheduler.js`
- `functions/environmentState.js`
- `functions/generateMessage.js`
- `functions/utteranceQueue.js`
- `functions/logger.js`

### Discord Flow

```txt
discordBot.js
  -> Discord Client login
  -> scheduler loop
  -> generateMessage()
  -> channel.send()
```

### X Flow

```txt
xBot.js
  -> scheduler loop
  -> generateMessage()
  -> xClient.postTweet()
```

X 版では Discord Client、channel fetch、Discord token は不要にする。

## Entry Point

`bot.js` は `BOT_TARGET` で起動対象を選ぶ。

```js
const target = process.env.BOT_TARGET || "x";

if (target === "discord") {
  require("./discordBot");
} else {
  require("./xBot");
}
```

移行中は次のように切り替えられる。

```bash
BOT_TARGET=discord node bot.js
BOT_TARGET=x node bot.js
```

X 投稿が安定したら、Discord 側を削除してもよい。

## X Posting Modules

追加する module:

```txt
functions/xClient.js
```

### xClient.js

責務:

- X API `POST /2/tweets` を呼ぶ。
- OAuth 1.0a User Context の static token で投稿する。
- 280文字制限を確認する。
- 同一文の短時間連投を避ける。
- rate limit guard を入れる。
- dry-run mode では実投稿せず、投稿予定の text と state だけを保存する。
- API error を扱う。

想定 API:

```js
await postTweet({
  text,
  settings,
});
```

## Authentication

X へ投稿するには、投稿対象アカウントの user context token が必要になる。

今回の実装では OAuth 1.0a User Context を使う。

必要なもの:

- X Developer Account
- X App
- API Key
- API Key Secret
- Access Token
- Access Token Secret

Bearer token だけの app-only 認証では投稿できない可能性が高いため、`X_BEARER_TOKEN` は投稿には使わない。

OAuth 2.0 Authorization Code Flow with PKCE は、将来 refresh token や別アカウント認可を細かく扱う必要が出た時の拡張候補にする。

## X API Setup Steps

X API の設定は X Developer Portal / Developer Console で行う。

参考:

- [Developer Console](https://docs.x.com/resources/fundamentals/developer-portal)
- [Apps](https://docs.x.com/fundamentals/developer-apps)
- [OAuth 1.0a](https://docs.x.com/fundamentals/authentication/oauth-1-0a/overview)

### 1. Developer Account を用意する

1. X Developer Portal にログインする。
2. Developer Account を作成、または既存の developer account を使う。
3. 利用中の plan で `POST /2/tweets` が使えるか確認する。

注意:

- X API の plan / 権限は変更されることがある。
- 投稿 API が使えない plan の場合、実装しても `403` などで失敗する。

### 2. Project / App を作る

1. Developer Portal で Project を作成する。
2. Project 内に App を作成する。
3. App 名は例として `Yotumiya Akari Bot` などにする。

この App が X API へアクセスする単位になる。

### 3. App Permissions を設定する

App の設定で権限を投稿可能な状態にする。

必要な権限:

- Read
- Write

Tweet 投稿には write 権限が必要である。

### 4. OAuth 1.0a credentials を取得する

App の Keys and tokens から次を取得する。

- API Key
- API Key Secret
- Access Token
- Access Token Secret

Access Token / Access Token Secret は投稿する X アカウントの user context credentials である。

### 5. `.env` に credentials を保存する

`.env` に保存する。

```env
BOT_TARGET=x

X_API_KEY=取得したAPI Key
X_API_KEY_SECRET=取得したAPI Key Secret
X_ACCESS_TOKEN=取得したAccess Token
X_ACCESS_TOKEN_SECRET=取得したAccess Token Secret
```

これらは Git に入れない。

### 6. OAuth 2.0 credentials は将来用として残す

OAuth 2.0 PKCE を使う場合は次も使う。

```env
X_CLIENT_ID=
X_CLIENT_SECRET=
X_CALLBACK_URL=http://localhost:3000/x/callback
X_TOKEN_PATH=memory/x_token.json
```

ただし OAuth 1.0a static token 方式では最初は不要。

### 7. dry-run で確認する

最初は実投稿せずに確認する。

```env
BOT_TARGET=x
```

```json
{
  "xDryRun": true
}
```

確認すること:

- scheduler が投稿タイミングを検出する。
- message が生成される。
- X投稿予定の text がログに出る。
- 280文字制限に収まっている。
- `memory/x_post_state.json` が更新される。

### 8. 実投稿を有効化する

dry-run が問題なければ実投稿に切り替える。

```json
{
  "xDryRun": false
}
```

実投稿後に確認すること:

- X に投稿が表示される。
- `memory/x_post_state.json` に投稿履歴が残る。
- 同じ時間帯に重複投稿されない。

## API Setup Checklist

- [ ] X Developer Account がある。
- [ ] X Project / App を作成した。
- [ ] App permissions が Read and Write になっている。
- [ ] API Key を `.env` に入れた。
- [ ] API Key Secret を `.env` に入れた。
- [ ] Access Token を `.env` に入れた。
- [ ] Access Token Secret を `.env` に入れた。
- [ ] dry-run で定時投稿 flow を確認した。
- [ ] 実投稿で `POST /2/tweets` が成功した。

## Environment Variables

`.env` に置く候補:

```env
BOT_TARGET=x

X_API_KEY=
X_API_KEY_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
X_DRY_RUN=true
```

OAuth 2.0 PKCE を将来使う場合の候補:

```env
X_CLIENT_ID=
X_CLIENT_SECRET=
X_CALLBACK_URL=http://localhost:3000/x/callback
X_TOKEN_PATH=memory/x_token.json
```

Discord を残す場合:

```env
BOT_TARGET=discord
DISCORD_TOKEN=
```

## Settings

`config/settings.example.json` に追加・整理する候補:

```json
{
  "postTarget": "x",
  "xEnabled": true,
  "xDryRun": false,
  "xMaxLength": 280,
  "xRateLimitPer15Min": 15,
  "postRetryCount": 2
}
```

`xDryRun` が true の場合は API へ投稿せず、ログと state 保存だけ行う。

`.env` の `X_DRY_RUN=true` / `X_DRY_RUN=false` は `settings.xDryRun` より優先する。初回確認では `X_DRY_RUN=true` を推奨する。

## Safety

X投稿では次を守る。

- 280文字を超える場合は投稿しない、または短縮する。
- 同一文の短時間連投を避ける。
- 直近投稿履歴を保存する。
- rate limit guard を入れる。
- API failure で process 全体を落とさない。
- dry-run mode を用意する。

状態保存候補:

```txt
memory/x_post_state.json
```

`.gitignore` 対象にする。

## Migration Steps

### Step 1: Split Bot Entry

- `bot.js` を entry point にする。
- 既存の Discord 実装を `discordBot.js` へ移す。
- `BOT_TARGET=discord` で旧動作を維持する。

### Step 2: Add X Bot Skeleton

- `xBot.js` を追加する。
- scheduler / environment / generateMessage を共通利用する。
- 投稿部分は dry-run でログ出力する。

### Step 3: Add X Client

- `functions/xClient.js` を追加する。
- `postTweet()` を実装する。
- 280文字制限、retry、rate limit guard を入れる。

### Step 4: Add OAuth 1.0a Credentials

- X Developer Portal で API Key / API Key Secret を取得する。
- 投稿するアカウント用の Access Token / Access Token Secret を取得する。
- `.env` に `X_API_KEY`、`X_API_KEY_SECRET`、`X_ACCESS_TOKEN`、`X_ACCESS_TOKEN_SECRET` を入れる。
- `xDryRun=true` で投稿予定ログと state 更新を確認する。

### Step 5: Enable Production Posting

- `BOT_TARGET=x`
- `xDryRun=false`
- 定時投稿を X へ送る。

## Non-goals

最初の実装では次は扱わない。

- 画像投稿。
- thread 投稿。
- 返信 bot。
- mention 監視。
- 複数アカウント運用。
- X API plan 自動判定。

## Open Questions

- X API plan で `POST /2/tweets` が利用可能か。
- X投稿安定後、Discord側を完全削除するか、手動切替用に残すか。
