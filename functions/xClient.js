const { TwitterApi } = require("twitter-api-v2");

const { readState, writeState } = require("./stateStore");

function getXCredentials() {
  const credentials = {
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_KEY_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  };

  const missing = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing X OAuth 1.0a credentials: ${missing.join(", ")}`);
  }

  return credentials;
}

function createXClient(credentials = getXCredentials(), options = {}) {
  const TwitterApiClass = options.TwitterApiClass || TwitterApi;
  return new TwitterApiClass(credentials);
}

function normalizeTweetText(text, maxLength = 280) {
  const normalized = String(text || "").trim();

  if (!normalized) {
    throw new Error("X post text is empty");
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1))}…`;
}

function canPostToX(settings, now = new Date()) {
  const state = readState("x_post_state.json", { postedAt: [], recentTexts: [] }, settings);
  const windowMs = 15 * 60 * 1000;
  const recent = state.postedAt.filter((iso) => now - new Date(iso) < windowMs);
  const limit = settings.xRateLimitPer15Min || 15;

  return {
    allowed: recent.length < limit,
    recent,
  };
}

function rememberXPost(settings, text, now = new Date()) {
  const state = readState("x_post_state.json", { postedAt: [], recentTexts: [] }, settings);

  return writeState(
    "x_post_state.json",
    {
      postedAt: [...(state.postedAt || []), now.toISOString()].slice(-100),
      recentTexts: [...(state.recentTexts || []), text].slice(-30),
    },
    settings,
  );
}

function hasRecentDuplicate(settings, text) {
  const state = readState("x_post_state.json", { postedAt: [], recentTexts: [] }, settings);
  return (state.recentTexts || []).includes(text);
}

function isXDryRun(settings) {
  if (process.env.X_DRY_RUN === "true") {
    return true;
  }

  if (process.env.X_DRY_RUN === "false") {
    return false;
  }

  return Boolean(settings.xDryRun);
}

async function postTweet({ text, settings, client = null }) {
  const maxLength = settings.xMaxLength || 280;
  const tweetText = normalizeTweetText(text, maxLength);

  if (hasRecentDuplicate(settings, tweetText)) {
    throw new Error("X duplicate post guard blocked this post");
  }

  const rate = canPostToX(settings);
  if (!rate.allowed) {
    throw new Error("X rate limit guard blocked this post");
  }

  if (isXDryRun(settings)) {
    rememberXPost(settings, tweetText);
    return {
      dryRun: true,
      text: tweetText,
    };
  }

  const resolvedClient = client || createXClient();
  const result = await resolvedClient.v2.tweet(tweetText);
  rememberXPost(settings, tweetText);
  return result;
}

module.exports = {
  canPostToX,
  createXClient,
  getXCredentials,
  hasRecentDuplicate,
  isXDryRun,
  normalizeTweetText,
  postTweet,
  rememberXPost,
};
