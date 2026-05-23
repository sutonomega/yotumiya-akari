const fs = require("fs");

const path = require("path");

const generateMessage = require("../functions/generateMessage");

const processHistory = require("../functions/processHistory");

// =========================
// settings
// =========================

const settings = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "..", "config", "settings.json"),
    "utf-8",
  ),
);

// =========================
// 質問リスト読み込み
// =========================

const questions = fs
  .readFileSync(path.join(__dirname, "questions.txt"), "utf-8")
  .split("\n")
  .map((v) => v.trim())
  .filter(Boolean);

// =========================
// 初期化
// =========================

function initializeEval() {
  // =========================
  // memory dir
  // =========================

  if (!fs.existsSync(path.join(process.cwd(), settings.memoryDir))) {
    fs.mkdirSync(
      path.join(process.cwd(), settings.memoryDir),

      {
        recursive: true,
      },
    );
  }

  // =========================
  // results dir
  // =========================

  if (!fs.existsSync(path.join(__dirname, "results"))) {
    fs.mkdirSync(path.join(__dirname, "results"));
  }

  // =========================
  // memory reset
  // =========================

  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "chat_history.txt"),
    "",
    "utf-8",
  );

  fs.writeFileSync(
    path.join(process.cwd(), settings.memoryDir, "long_memory.txt"),
    "",
    "utf-8",
  );

  console.log("[EVAL INITIALIZED]");
}

// =========================
// wait
// =========================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =========================
// eval
// =========================

async function runEval() {
  initializeEval();

  const timestamp = Date.now();

  const resultPath = path.join(__dirname, "results", `eval_${timestamp}.txt`);

  for (let i = 0; i < questions.length; i++) {
    const userMessage = questions[i];

    console.log("");
    console.log("=========================");

    console.log(`[QUESTION ${i + 1}]`);

    console.log(userMessage);

    // =========================
    // message生成
    // =========================

    const aiMessage = await generateMessage({
      mode: "reply",

      userMessage,
    });

    console.log("");
    console.log("[AI]");
    console.log(aiMessage);

    // =========================
    // history処理
    // =========================

    await processHistory({
      settings,

      mode: "reply",

      userMessage,

      aiMessage,
    });

    // =========================
    // long memory取得
    // =========================

    let longMemory = "";

    const longMemoryPath = path.join(
      process.cwd(),
      settings.memoryDir,
      "long_memory.txt",
    );

    if (fs.existsSync(longMemoryPath)) {
      longMemory = fs.readFileSync(longMemoryPath, "utf-8").trim();
    }

    // =========================
    // 保存
    // =========================

    const logText = `
=========================

QUESTION:
${userMessage}

AI:
${aiMessage}

LONG MEMORY:
${longMemory}

`;

    fs.appendFileSync(
      resultPath,

      logText,
    );

    // =========================
    // 少し待機
    // =========================

    await sleep(1000);
  }

  console.log("");

  console.log("[EVAL COMPLETE]");

  console.log(resultPath);
}

// =========================
// 実行
// =========================

runEval();
