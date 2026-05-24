require("dotenv").config();

const fs = require("fs");

const path = require("path");

const { Client, GatewayIntentBits } = require("discord.js");

const log = require("./functions/logger");

const checkScheduler = require("./functions/scheduler");

const generateMessage = require("./functions/generateMessage");

const speak = require("./functions/speak");

// =========================
// config
// =========================

const settings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "config", "settings.json"), "utf-8"),
);

// =========================
// Discord Client
// =========================

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// =========================
// 起動
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
          // scheduler判定
          // =========================

          const event = await checkScheduler();

          if (!event) {
            return;
          }

          // =========================
          // channel取得
          // =========================

          const channel = await client.channels.fetch(settings.channelId);

          if (!channel) {
            return;
          }

          // =========================
          // message生成
          // =========================

          const message = await generateMessage({
            settings,

            mode: event.mode,
          });

          log(
            "INFO",

            "メッセージ生成完了",
          );

          // =========================
          // voice
          // =========================

          if (settings.enableVoice) {
            try {
              await speak(message);
            } catch (error) {
              console.log("[VOICE ERROR]", error);
            }
          }

          // =========================
          // Discord送信
          // =========================

          await channel.send(message);

          log(
            "INFO",

            "時報送信完了",
          );
        } catch (error) {
          console.log("[SCHEDULER ERROR]", error);
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
