const fs = require("fs");

const cron = require("node-cron");

const log = require("./logger");

const CHANNEL_ID = "1506657409622610083";

function startScheduler(client) {
  cron.schedule(
    "* * * * *",

    async () => {
      log("SYSTEM", "定期チェック");

      // =========================
      // mood読み込み
      // =========================

      const moodData = JSON.parse(fs.readFileSync("memory/mood.json", "utf-8"));

      // =========================
      // scheduler状態読み込み
      // =========================

      let schedulerData = {
        lastAutoMessage: null,
      };

      if (fs.existsSync("memory/scheduler.json")) {
        schedulerData = JSON.parse(
          fs.readFileSync("memory/scheduler.json", "utf-8"),
        );
      }

      // =========================
      // 最終会話時間
      // =========================

      const now = new Date();

      const lastTalkTime = new Date(moodData.lastTalkTime);

      const diffMs = now - lastTalkTime;

      const diffHours = diffMs / (1000 * 60 * 60);

      // =========================
      // 最終自発発言時間
      // =========================

      let autoDiffHours = 999;

      if (schedulerData.lastAutoMessage) {
        const lastAuto = new Date(schedulerData.lastAutoMessage);

        autoDiffHours = (now - lastAuto) / (1000 * 60 * 60);
      }

      // =========================
      // 6時間会話なし
      // =========================

      if (diffHours >= 6 && autoDiffHours >= 6) {
        log("SYSTEM", "自発発言送信");

        const channel = await client.channels.fetch(CHANNEL_ID);

        await channel.send("少し静かだね。\n調子はどう？");

        // =========================
        // 自発発言時間保存
        // =========================

        schedulerData.lastAutoMessage = now.toISOString();

        fs.writeFileSync(
          "memory/scheduler.json",

          JSON.stringify(schedulerData, null, 2),
        );
      }
    },
  );
}

module.exports = startScheduler;
