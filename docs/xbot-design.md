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

追加候補:

```txt
functions/xClient.js
functions/xTokenStore.js
scripts/x-auth.js
```

### xClient.js

責務:

- X API `POST /2/tweets` を呼ぶ。
- 280文字制限を確認する。
- API error を扱う。
- token refresh が必要な場合は `xTokenStore` に委譲する。

想定 API:

```js
await postTweet({
  text,
  settings,
});
```

### xTokenStore.js

責務:

- access token / refresh token を読み込む。
- refresh token を使って access token を更新する。
- token を保存する。

保存先候補:

```txt
memory/x_token.json
```

`.gitignore` 対象にする。

### scripts/x-auth.js

責務:

- 初回認証用の authorization URL を生成する。
- authorization code を受け取る。
- access token / refresh token を保存する。

これは常時実行 bot ではなく、初回セットアップ用 script として扱う。

## Authentication

X へ投稿するには、投稿対象アカウントの user context token が必要になる。

必要なもの:

- X Developer Account
- X App
- Client ID
- Client Secret
- Callback URL
- OAuth 2.0 User Context
- `tweet.write` scope
- `tweet.read` scope
- `users.read` scope
- `offline.access` scope

Bearer token だけの app-only 認証では投稿できない可能性が高いため、OAuth 2.0 Authorization Code Flow with PKCE を前提にする。

## Environment Variables

`.env` に置く候補:

```env
BOT_TARGET=x

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

### Step 4: Add OAuth Setup

- `functions/xTokenStore.js` を追加する。
- `scripts/x-auth.js` を追加する。
- 初回認証で `memory/x_token.json` を作る。

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
- callback URL を localhost にするか、固定の外部URLにするか。
- token 保存先を `memory/x_token.json` にするか、`.env` にするか。
- X投稿安定後、Discord側を完全削除するか、手動切替用に残すか。
