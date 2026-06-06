require("dotenv").config();

const loadSettings = require("./functions/loadSettings");
const { resolveBotTarget } = require("./functions/botTarget");

const target = resolveBotTarget(loadSettings());

if (target === "discord") {
  require("./functions/discordBot");
} else {
  require("./functions/xBot");
}
