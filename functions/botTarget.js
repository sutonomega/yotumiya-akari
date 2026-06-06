function getTargets(settings = {}) {
  if (Array.isArray(settings.postTargets)) {
    return settings.postTargets;
  }

  if (settings.postTarget) {
    return [settings.postTarget];
  }

  return ["x"];
}

function resolveBotTarget(settings = {}) {
  const targets = getTargets(settings);

  if (targets.includes("discord") && !targets.includes("x")) {
    return "discord";
  }

  return "x";
}

module.exports = {
  resolveBotTarget,
};
