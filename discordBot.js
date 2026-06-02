require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const log = require("./functions/logger");

const checkScheduler = require("./functions/scheduler");

const { getEnvironmentState } = require("./functions/environmentState");

const generateMessage = require("./functions/generateMessage");

const speak = require("./functions/speak");

const loadSettings = require("./functions/loadSettings");
const utteranceQueue = require("./functions/utteranceQueue");
const { postMessage } = require("./functions/postTarget");

// =========================
// settings
// =========================

const settings = loadSettings();

// =========================
// discord client
// =========================

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// =========================
// ready
// =========================

client.once(
  "clientReady",

  async () => {
    log(
      "SYSTEM",

      `起動: ${client.user.tag}`,
    );

    // =========================
    // scheduler loop
    // =========================

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
          // channel
          // =========================

          const channel = await client.channels.fetch(settings.channelId);

          if (!channel) {
            return;
          }

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
          // discord send
          // =========================

          await postMessage({
            settings,
            message,
            discordChannel: channel,
          });

          log(
            "DISCORD",

            "時報送信完了",
          );
        } catch (error) {
          console.log(
            "[SCHEDULER ERROR]",

            error,
          );
        }
      },

      60 * 1000,
    );
  },
);

// =========================
// login
// =========================

client.login(process.env.DISCORD_TOKEN);
