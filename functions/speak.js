const fs = require("fs");

const path = require("path");

// =========================
// 音声生成
// =========================

async function speak(text) {
  try {
    // =========================
    // audio_query
    // =========================

    const queryResponse = await fetch(
      "http://127.0.0.1:50021/audio_query?text=" +
        encodeURIComponent(text) +
        "&speaker=14",

      {
        method: "POST",
      },
    );

    const queryData = await queryResponse.json();

    // =========================
    // synthesis
    // =========================

    const synthResponse = await fetch(
      "http://127.0.0.1:50021/synthesis?speaker=14",

      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(queryData),
      },
    );

    // =========================
    // wav保存
    // =========================

    const audioBuffer = await synthResponse.arrayBuffer();

    fs.writeFileSync(
      path.join(process.cwd(), "public", "output.wav"),

      Buffer.from(audioBuffer),
    );

    console.log("[VOICE GENERATED]");
  } catch (error) {
    console.log("[VOICE ERROR]", error);
  }
}

module.exports = speak;
