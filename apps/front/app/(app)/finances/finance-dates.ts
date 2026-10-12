// Quick filters use Buenos Aires regardless of the browser's timezone.
export const buenosAiresToday = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
};
export const getCurrentMonthRange = (now = new Date()) => {
  const today = buenosAiresToday(now);
  return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
};
export const getLastDaysRange = (days: number, now = new Date()) => {
  const today = buenosAiresToday(now);
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: start.toISOString().slice(0, 10), endDate: today };
};
