require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const chat = require("./index");

const log = require("./logger");

const startScheduler = require("./scheduler");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  log("SYSTEM", `起動: ${client.user.tag}`);

  // =========================
  // scheduler開始
  // =========================

  startScheduler(client);
});

client.on(
  "messageCreate",

  async (message) => {
    if (message.author.bot) {
      return;
    }

    log("DISCORD", `${message.author.username}: ${message.content}`);

    try {
      // 入力中表示
      await message.channel.sendTyping();

      const reply = await chat(message.content);

      await message.reply(reply);
    } catch (error) {
      console.log(error);

      log("ERROR", error.stack);

      await message.reply("エラーが発生しました。");
    }
  },
);

client.login(process.env.DISCORD_TOKEN);
