require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const log = require("./logger");

const checkScheduler = require("./scheduler");

const { getEnvironmentState } = require("./environmentState");

const generateMessage = require("./generateMessage");

const speak = require("./speak");

const loadSettings = require("./loadSettings");
const utteranceQueue = require("./utteranceQueue");
const { postMessage } = require("./postTarget");

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
