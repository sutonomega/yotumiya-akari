const assert = require("node:assert/strict");
const test = require("node:test");

const { resolveBotTarget } = require("../functions/botTarget");

test("resolveBotTarget uses postTargets as the single bot target source", () => {
  assert.equal(resolveBotTarget({ postTargets: ["discord"] }), "discord");
  assert.equal(resolveBotTarget({ postTargets: ["x"] }), "x");
  assert.equal(resolveBotTarget({ postTarget: "discord" }), "discord");
});

test("resolveBotTarget defaults to x for mixed or missing targets", () => {
  assert.equal(resolveBotTarget({ postTargets: ["x", "discord"] }), "x");
  assert.equal(resolveBotTarget({}), "x");
});
