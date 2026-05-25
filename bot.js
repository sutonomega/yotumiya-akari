require("dotenv").config();

const fs = require("fs");

const path = require("path");

const { Client, GatewayIntentBits } = require("discord.js");

const log = require("./functions/logger");

const checkScheduler = require("./functions/scheduler");

const getCurrentState = require("./functions/getCurrentState");

const generateMessage = require("./functions/generateMessage");

const speak = require("./functions/speak");

// =========================
// settings
// =========================

const settings = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),

      "config",

      "settings.json",
    ),

    "utf-8",
  ),
);

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

          const currentState = getCurrentState();

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

          const message = await generateMessage({
            settings,

            mode: event.mode,

            currentHour: currentState.hour,
          });

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

          await channel.send(message);

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
