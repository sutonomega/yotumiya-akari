const fs = require("fs");

const path = require("path");

// =========================
// loadSettings
// =========================

function loadSettings() {
  // =========================
  // base settings
  // =========================

  const baseSettings = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),

        "config",

        "settings.json",
      ),

      "utf-8",
    ),
  );

  // =========================
  // local settings
  // =========================

  let localSettings = {};

  const localPath = path.join(
    process.cwd(),

    "config",

    "settings.local.json",
  );

  if (fs.existsSync(localPath)) {
    localSettings = JSON.parse(
      fs.readFileSync(
        localPath,

        "utf-8",
      ),
    );
  }

  // =========================
  // merge
  // =========================

  return {
    ...baseSettings,

    ...localSettings,
  };
}

module.exports = loadSettings;
