require("dotenv").config();

const target = process.env.BOT_TARGET || "x";

if (target === "discord") {
  require("./functions/discordBot");
} else {
  require("./functions/xBot");
}
