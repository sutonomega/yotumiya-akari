const fs = require("fs");

const path = require("path");

// =========================
// log path
// =========================

const logDir = path.join(process.cwd(), "logs");

const logPath = path.join(logDir, "app.log");

// =========================
// logs directory check
// =========================

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, {
    recursive: true,
  });
}

// =========================
// logger
// =========================

function log(type, message) {
  const now = new Date();

  const timestamp =
    `${now.getFullYear()}/` +
    `${now.getMonth() + 1}/` +
    `${now.getDate()} ` +
    `${now.getHours()}:` +
    `${now.getMinutes()}:` +
    `${now.getSeconds()}`;

  const line = `[${timestamp}] ` + `[${type}] ` + `${message}`;

  console.log(line);

  fs.appendFileSync(
    logPath,

    line + "\n",
  );
}

module.exports = log;
