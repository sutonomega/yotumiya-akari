const fs = require("fs");
const path = require("path");

const loadSettings = require("./loadSettings");
const loadJson = require("./loadJson");

function getSettings(settings = null) {
  return settings || loadSettings();
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function memoryPath(fileName, settings = null) {
  const currentSettings = getSettings(settings);
  return path.join(process.cwd(), currentSettings.memoryDir, fileName);
}

function readState(fileName, defaultValue = {}, settings = null) {
  return loadJson(memoryPath(fileName, settings), defaultValue);
}

function writeState(fileName, value, settings = null) {
  const filePath = memoryPath(fileName, settings);
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
  return value;
}

function updateState(fileName, defaultValue, updater, settings = null) {
  const current = readState(fileName, defaultValue, settings);
  const next = updater({ ...current });
  return writeState(fileName, next, settings);
}

function appendMemoryText(fileName, text, settings = null) {
  const filePath = memoryPath(fileName, settings);
  ensureDir(filePath);
  fs.appendFileSync(filePath, text, "utf-8");
}

module.exports = {
  appendMemoryText,
  memoryPath,
  readState,
  updateState,
  writeState,
};
