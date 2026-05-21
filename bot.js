require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");

const chat = require("./index");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`起動: ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  try {
    console.log(`${message.author.username}: ${message.content}`);

    // 考え中メッセージ
    const thinkingMessage = await message.reply("...");

    // AI返答
    const reply = await chat(message.content);

    // メッセージ更新
    await thinkingMessage.edit(reply);
  } catch (error) {
    console.error(error);

    await message.reply("エラーが発生しました");
  }
});

client.login(
  process.env.DISCORD_TOKEN
);