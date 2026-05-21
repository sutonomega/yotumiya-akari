const fs = require("fs");

function writeLog(type, message) {
  const now = new Date().toLocaleString(
    "ja-JP",
    {
      timeZone: "Asia/Tokyo",
    }
  );

  const logMessage =
    `[${now}] [${type}] ${message}\n`;

  console.log(logMessage);

  fs.appendFileSync(
    "logs/app.log",
    logMessage
  );
}

module.exports = writeLog;
