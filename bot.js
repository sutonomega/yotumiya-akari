require("dotenv").config();

const fs = require("fs");

const path = require("path");

const { Client, GatewayIntentBits } = require("discord.js");

const chat = require("./chat");

const checkScheduler = require("./scheduler");

const log = require("./logger");

// =========================
// settings読み込み
// =========================

const settings = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config", "settings.json", "utf-8")),
);

const CHANNEL_ID = settings.channelId;

// =========================
// Discord client
// =========================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,

    GatewayIntentBits.GuildMessages,

    GatewayIntentBits.MessageContent,
  ],
});

// =========================
// 起動完了
// =========================

client.once(
  "clientReady",

  () => {
    log("SYSTEM", `起動: ${client.user.tag}`);

    // =========================
    // scheduler監視
    // =========================

    setInterval(
      async () => {
        try {
          const event = await checkScheduler();

          if (!event) {
            return;
          }

          // =========================
          // chat実行
          // =========================

          const aiMessage = await chat({
            mode: event.mode,
          });

          // =========================
          // Discord送信
          // =========================

          const channel = await client.channels.fetch(CHANNEL_ID);

          await channel.send(aiMessage);
        } catch (error) {
          console.log("[SCHEDULER ERROR]", error);
        }
      },

      60 * 1000,
    );
  },
);

// =========================
// メッセージ受信
// =========================

client.on(
  "messageCreate",

  async (message) => {
    try {
      // =========================
      // BOT無視
      // =========================

      if (message.author.bot) {
        return;
      }

      // =========================
      // ログ
      // =========================

      log(
        "DISCORD",

        `${message.author.username}: ${message.content}`,
      );

      // =========================
      // chat実行
      // =========================

      const aiMessage = await chat({
        mode: "reply",

        userMessage: message.content,
      });

      // =========================
      // reply
      // =========================

      await message.reply(aiMessage);
    } catch (error) {
      console.log("[BOT ERROR]", error);
    }
  },
);

// =========================
// login
// =========================

client.login(process.env.DISCORD_TOKEN);
