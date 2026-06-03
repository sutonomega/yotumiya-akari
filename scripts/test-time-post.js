const fs = require("fs");
const path = require("path");

const loadSettings = require("../functions/loadSettings");

function statePath(settings, fileName) {
  return path.join(process.cwd(), settings.memoryDir, fileName);
}

function snapshotFiles(settings, fileNames) {
  return fileNames.map((fileName) => {
    const filePath = statePath(settings, fileName);
    return {
      exists: fs.existsSync(filePath),
      filePath,
      content: fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null,
    };
  });
}

function restoreFiles(snapshots) {
  for (const snapshot of snapshots) {
    if (snapshot.exists) {
      fs.mkdirSync(path.dirname(snapshot.filePath), { recursive: true });
      fs.writeFileSync(snapshot.filePath, snapshot.content, "utf-8");
    } else if (fs.existsSync(snapshot.filePath)) {
      fs.unlinkSync(snapshot.filePath);
    }
  }
}

function preserveMemory() {
  return process.env.YORUMIYA_TEST_PRESERVE_MEMORY !== "0";
}

function visualLogPath() {
  return process.env.TEST_TIME_POST_LOG_PATH || path.join(process.cwd(), "test", "log", "time-post.txt");
}

function appendVisualLog({ hour, message, logPath = visualLogPath(), date = new Date() }) {
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const entry = [
    "---",
    date.toISOString(),
    `hour: ${hour}`,
    message,
    "",
  ].join("\n");
  fs.appendFileSync(logPath, entry, "utf-8");
}

async function main() {
  require("dotenv").config();
  const generateMessage = require("../functions/generateMessage");
  const settings = loadSettings();
  const snapshots = preserveMemory()
    ? snapshotFiles(settings, ["recent_phrases.json", "time_signal_fallbacks.json"])
    : [];

  try {
    const hour = Number(
      process.env.TEST_TIME_POST_HOUR || process.argv[2] || new Date().getHours(),
    );

    const message = await generateMessage({
      mode: "post",
      currentHour: hour,
    });

    console.log(message);
    appendVisualLog({ hour, message });
  } finally {
    restoreFiles(snapshots);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  appendVisualLog,
  main,
  preserveMemory,
  restoreFiles,
  snapshotFiles,
  visualLogPath,
};
