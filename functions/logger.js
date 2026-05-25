const fs = require("fs");
const path = require("path");

const LOG_TYPES = Object.freeze({
  AI: "AI",
  SYSTEM: "SYSTEM",
  CHAT: "CHAT",
  MEMORY: "MEMORY",
  DISCORD: "DISCORD",
  X: "X",
  VOICE: "VOICE",
  ERROR: "ERROR",
  INFO: "INFO",
});

const logDir = path.join(process.cwd(), "logs");
const logPath = path.join(logDir, "app.log");

let logStream = null;

function ensureLogDir() {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

function getLogStream() {
  if (!logStream) {
    ensureLogDir();
    logStream = fs.createWriteStream(logPath, {
      flags: "a",
      encoding: "utf-8",
    });
  }

  return logStream;
}

function formatTimestamp(date = new Date()) {
  return date.toISOString();
}

function normalizeType(type) {
  if (!type) {
    return LOG_TYPES.INFO;
  }

  const normalized = String(type).toUpperCase();
  return LOG_TYPES[normalized] || normalized;
}

function log(type, message, meta = null) {
  const payload =
    meta === null || meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  const line = `[${formatTimestamp()}] [${normalizeType(type)}] ${message}${payload}`;

  console.log(line);
  getLogStream().write(`${line}\n`);
}

log.close = () => {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
};

log.types = LOG_TYPES;
log.ai = (message, meta) => log(LOG_TYPES.AI, message, meta);
log.system = (message, meta) => log(LOG_TYPES.SYSTEM, message, meta);
log.chat = (message, meta) => log(LOG_TYPES.CHAT, message, meta);
log.memory = (message, meta) => log(LOG_TYPES.MEMORY, message, meta);
log.error = (message, meta) => log(LOG_TYPES.ERROR, message, meta);

module.exports = log;
