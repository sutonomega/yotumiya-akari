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

function createLogger({
  logPath = path.join(process.cwd(), "logs", "app.log"),
  fsModule = fs,
  consoleLog = console.log,
  now = () => new Date(),
} = {}) {
  let logStream = null;
  const logDir = path.dirname(logPath);

  function ensureLogDir() {
    if (!fsModule.existsSync(logDir)) {
      fsModule.mkdirSync(logDir, { recursive: true });
    }
  }

  function getLogStream() {
    if (!logStream) {
      ensureLogDir();
      logStream = fsModule.createWriteStream(logPath, {
        flags: "a",
        encoding: "utf-8",
      });
    }

    return logStream;
  }

  function log(type, message, meta = null) {
    const payload =
      meta === null || meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
    const line = `[${formatTimestamp(now())}] [${normalizeType(type)}] ${message}${payload}`;

    consoleLog(line);
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

  return log;
}

const log = createLogger();

log.createLogger = createLogger;
log.formatTimestamp = formatTimestamp;
log.normalizeType = normalizeType;

module.exports = log;
