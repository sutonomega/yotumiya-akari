const fs = require("fs");

const path = require("path");

function writeLog(type, message) {
  const now = new Date().toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
  });

  const logMessage = `[${now}] [${type}] ${message}\n`;

  console.log(logMessage);

  fs.appendFileSync(
    path.join(__dirname, "logs", "app.log"),

    logMessage,
  );
}

module.exports = writeLog;
