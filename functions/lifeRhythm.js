function getLifeRhythmSlot(hour) {
  if (hour === 6) {
    return {
      mode: "post",
      kind: "good_morning",
      prompt: "6時。おはようの挨拶と、朝の生活感を短く入れる。",
    };
  }

  if (hour >= 7 && hour <= 23) {
    return {
      mode: "post",
      kind: "hourly",
      prompt: `${hour}時の時報。時間帯に合う生活感を一言だけ添える。`,
    };
  }

  if (hour === 0) {
    return {
      mode: "post",
      kind: "good_night",
      prompt: "0時。おやすみ前の静かな一言にする。",
    };
  }

  return {
    mode: "sleep",
    kind: "deep_night_stop",
    prompt: "深夜帯のため自動投稿を停止する。",
  };
}

function shouldPostAt({ hour, minute, schedulerData }) {
  if (minute !== 0) {
    return null;
  }

  const slot = getLifeRhythmSlot(hour);

  if (slot.mode === "sleep") {
    return null;
  }

  const currentSlot = `${hour}:${minute}:${slot.kind}`;

  if (schedulerData.lastPostTime === currentSlot) {
    return null;
  }

  return {
    ...slot,
    currentSlot,
  };
}

module.exports = {
  getLifeRhythmSlot,
  shouldPostAt,
};
