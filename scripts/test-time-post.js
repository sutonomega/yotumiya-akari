require("dotenv").config();

const generateMessage = require("../functions/generateMessage");

(async () => {
  const hour = Number(process.argv[2] || new Date().getHours());

  const message = await generateMessage({
    mode: "post",
    currentHour: hour,
  });

  console.log(message);
})();
