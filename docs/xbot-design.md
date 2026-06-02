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

## X API Setup Steps

X API の設定は X Developer Portal / Developer Console で行う。

参考:

- [Developer Console](https://docs.x.com/resources/fundamentals/developer-portal)
- [Apps](https://docs.x.com/fundamentals/developer-apps)
- [OAuth 2.0 Authorization Code Flow with PKCE](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)

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

### 4. OAuth 2.0 を有効化する

App の User authentication settings で OAuth 2.0 を有効にする。

推奨設定:

- App type: Web App / Automated App / Bot 用途に合うもの
- OAuth 2.0: enabled
- Callback URL: `http://localhost:3000/x/callback`
- Website URL: 任意の管理用URL、または公開している project / profile URL

callback URL は実装側の `X_CALLBACK_URL` と完全一致させる。

### 5. Scopes を設定する

OAuth 2.0 の scopes は次を使う。

```txt
tweet.read
tweet.write
users.read
offline.access
```

`offline.access` を付けると refresh token を受け取れる。定期実行 bot では access token の期限切れに備える必要があるため、refresh token を使う前提にする。

### 6. Client ID / Client Secret を取得する

App の Keys and tokens / OAuth 2.0 credentials から次を取得する。

- Client ID
- Client Secret

`.env` に保存する。

```env
X_CLIENT_ID=取得したClient ID
X_CLIENT_SECRET=取得したClient Secret
X_CALLBACK_URL=http://localhost:3000/x/callback
X_TOKEN_PATH=memory/x_token.json
```

Client Secret は Git に入れない。

### 7. 初回認証を行う

実装予定の `scripts/x-auth.js` で初回認証を行う。

想定フロー:

1. `npm run x:auth` を実行する。
2. script が authorization URL を表示する。
3. ブラウザで authorization URL を開く。
4. 投稿する X アカウントでログインし、App を許可する。
5. callback URL に redirect される。
6. callback URL の `code` を script に渡す、または local callback server が受け取る。
7. script が access token / refresh token を取得する。
8. `memory/x_token.json` に token を保存する。

保存される token file のイメージ:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "expiresAt": "2026-06-02T12:00:00.000Z"
}
```

`memory/x_token.json` は `.gitignore` 対象にする。

### 8. dry-run で確認する

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

### 9. 実投稿を有効化する

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
- token 期限切れ時に refresh できる。

## API Setup Checklist

- [ ] X Developer Account がある。
- [ ] X Project / App を作成した。
- [ ] App permissions が Read and Write になっている。
- [ ] OAuth 2.0 が enabled になっている。
- [ ] Callback URL と `X_CALLBACK_URL` が一致している。
- [ ] `tweet.read` scope を設定した。
- [ ] `tweet.write` scope を設定した。
- [ ] `users.read` scope を設定した。
- [ ] `offline.access` scope を設定した。
- [ ] Client ID を `.env` に入れた。
- [ ] Client Secret を `.env` に入れた。
- [ ] 初回認証で `memory/x_token.json` を作成した。
- [ ] dry-run で定時投稿 flow を確認した。
- [ ] 実投稿で `POST /2/tweets` が成功した。

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
