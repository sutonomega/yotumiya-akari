require("dotenv").config();

const target = process.env.BOT_TARGET || "x";

if (target === "discord") {
  require("./discordBot");
} else {
  require("./xBot");
}
