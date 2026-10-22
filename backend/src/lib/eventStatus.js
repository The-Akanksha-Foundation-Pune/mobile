/** Event status is derived from its dates, in India time: upcoming -> ongoing (live) -> complete. */
function todayIst() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function dayOf(value) {
  if (!value) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString().slice(0, 10);
}

function deriveEventStatus(event) {
  const start = dayOf(event.eventDate);
  const end = dayOf(event.endDate) || start;
  const today = todayIst();
  if (!start) return "upcoming";
  if (today < start) return "upcoming";
  if (today > end) return "complete";
  return "ongoing";
}

function isLive(event) {
  return deriveEventStatus(event) === "ongoing";
}

module.exports = { todayIst, deriveEventStatus, isLive };
