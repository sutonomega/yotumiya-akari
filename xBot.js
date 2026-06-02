require("dotenv").config();

const log = require("./functions/logger");

const checkScheduler = require("./functions/scheduler");

const { getEnvironmentState } = require("./functions/environmentState");

const generateMessage = require("./functions/generateMessage");

const speak = require("./functions/speak");

const loadSettings = require("./functions/loadSettings");
const utteranceQueue = require("./functions/utteranceQueue");
const { postTweet } = require("./functions/xClient");

// =========================
// settings
// =========================

const settings = loadSettings();

// =========================
// scheduler loop
// =========================

log(
  "SYSTEM",

  "X bot 起動",
);

setInterval(
  async () => {
    try {
      // =========================
      // scheduler check
      // =========================

      const event = await checkScheduler();

      if (!event) {
        return;
      }

      // =========================
      // current state
      // =========================

      const currentState = await getEnvironmentState({ settings });

      // =========================
      // generate message
      // =========================

      const message = await utteranceQueue.enqueue("scheduler:post", () =>
        generateMessage({
          mode: event.mode,

          currentState,

          eventPrompt: event.prompt,
        }),
      );

      log(
        "INFO",

        `生成: ${message}`,
      );

      // =========================
      // voice
      // =========================

      if (settings.enableVoice) {
        try {
          await speak(message);

          log(
            "VOICE",

            "音声再生完了",
          );
        } catch (error) {
          console.log(
            "[VOICE ERROR]",

            error,
          );
        }
      }

      // =========================
      // x post
      // =========================

      const result = await postTweet({
        settings,
        text: message,
      });

      log(
        "X",

        settings.xDryRun ? `dry-run: ${result.text}` : "定期投稿完了",
      );
    } catch (error) {
      console.log(
        "[X BOT ERROR]",

        error,
      );
    }
  },

  60 * 1000,
);
