function formatTimeText(hour) {
  const normalizedHour = Number(hour);

  if (normalizedHour === 0) {
    return "午前0時";
  }

  if (normalizedHour < 12) {
    return `午前${normalizedHour}時`;
  }

  if (normalizedHour === 12) {
    return "午後0時";
  }

  return `午後${normalizedHour - 12}時`;
}

module.exports = {
  formatTimeText,
};
