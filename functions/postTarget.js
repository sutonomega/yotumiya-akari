const log = require("./logger");
const { canPostToX, postTweet } = require("./xClient");

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

async function postToX(settings, message) {
  return postTweet({ settings, text: message });
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
