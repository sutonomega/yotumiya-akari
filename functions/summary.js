const fs = require("fs");

const path = require("path");
const { createLlmProvider } = require("./llmProvider");

// =========================
// summary生成
// =========================

async function generateSummary(settings, chatText) {
  try {
    const promptTemplate = fs.readFileSync(
      path.join(__dirname, "..", "prompts", "summary.txt"),
      "utf-8",
    );

    const prompt = promptTemplate.replace("{{CHAT_TEXT}}", chatText);

    const provider = createLlmProvider(settings);
    const summary = await provider.generate(prompt, { model: settings.summaryModel });

    console.log("[SUMMARY]", summary);

    return summary;
  } catch (error) {
    console.log("[SUMMARY ERROR]", error);

    return "";
  }
}

module.exports = generateSummary;
