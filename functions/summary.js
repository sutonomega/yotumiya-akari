const fs = require("fs");

const path = require("path");

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

// =========================
// summary生成
// =========================

async function generateSummary(chatText) {
  try {
    const promptTemplate = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "summary.txt"),
      "utf-8",
    );

    const prompt = promptTemplate.replace("{{CHAT_TEXT}}", chatText);

    const response = await fetch(
      "http://localhost:11434/api/generate",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: settings.summaryModel,

          prompt,

          stream: false,
        }),
      },
    );

    const data = await response.json();

    let summary = data?.response?.trim() || "";

    summary = summary.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    console.log("[SUMMARY]", summary);

    return summary;
  } catch (error) {
    console.log("[SUMMARY ERROR]", error);

    return "";
  }
}

module.exports = generateSummary;
