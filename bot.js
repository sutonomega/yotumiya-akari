require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");

const chat = require("./index");

const log = require("./logger");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", () => {
  log("SYSTEM", `起動: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    return;
  }

  log("DISCORD", `${message.author.username}: ${message.content}`);

  try {
    // 入力中表示
    await message.channel.sendTyping();

    const reply = await chat(message.content);

    // replyへ戻す
    await message.reply(reply);
  } catch (error) {
    console.log(error);

    log("ERROR", error.stack);

    // エラー通知復活
    await message.reply("エラーが発生しました。");
  }
});

client.login(process.env.DISCORD_TOKEN);
