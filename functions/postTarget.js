const log = require("./logger");
const { readState, writeState } = require("./stateStore");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTargets(settings) {
  if (Array.isArray(settings.postTargets)) {
    return settings.postTargets;
  }

  if (settings.postTarget) {
    return [settings.postTarget];
  }

  return ["discord"];
}

function canPostToX(settings, now = new Date()) {
  const state = readState("x_post_state.json", { postedAt: [] }, settings);
  const windowMs = 15 * 60 * 1000;
  const recent = state.postedAt.filter((iso) => now - new Date(iso) < windowMs);
  const limit = settings.xRateLimitPer15Min || 15;
  return {
    allowed: recent.length < limit,
    recent,
  };
}

async function postToX(settings, message) {
  const token = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN;

  if (!token) {
    throw new Error("X_BEARER_TOKEN is required for X posting");
  }

  const rate = canPostToX(settings);
  if (!rate.allowed) {
    throw new Error("X rate limit guard blocked this post");
  }

  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`X post failed: ${response.status} ${await response.text()}`);
  }

  const state = readState("x_post_state.json", { postedAt: [] }, settings);
  writeState(
    "x_post_state.json",
    {
      postedAt: [...state.postedAt, new Date().toISOString()].slice(-100),
    },
    settings,
  );

  return response.json();
}

async function withRetry(task, retries = 2, delayMs = 1000) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(delayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function postMessage({ settings, message, discordChannel = null }) {
  const results = [];

  for (const target of getTargets(settings)) {
    if (target === "discord") {
      if (!discordChannel) {
        continue;
      }

      const result = await withRetry(() => discordChannel.send(message), settings.postRetryCount || 2);
      results.push({ target, result });
      log("DISCORD", "post sent");
      continue;
    }

    if (target === "x") {
      const result = await withRetry(() => postToX(settings, message), settings.postRetryCount || 2);
      results.push({ target, result });
      log("X", "post sent");
    }
  }

  return results;
}

module.exports = {
  canPostToX,
  getTargets,
  postMessage,
  postToX,
  withRetry,
};
