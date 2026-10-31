export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export const PRERENDER_TIME = Date.UTC(2026, 0, 1);

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", YEAR],
  ["month", MONTH],
  ["week", WEEK],
  ["day", DAY],
  ["hour", HOUR],
  ["minute", MINUTE],
];

const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

export function timeAgo(createdAt: number, now: number) {
  const elapsed = now - createdAt;
  const match = UNITS.find(([, length]) => elapsed >= length);
  if (!match) return "just now";

  const [unit, length] = match;
  return relative.format(-Math.floor(elapsed / length), unit);
}

export function currentMinute() {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

export function subscribeToMinutes(onTick: () => void) {
  let timer: ReturnType<typeof setTimeout>;

  const scheduleNext = () => {
    timer = setTimeout(
      () => {
        onTick();
        scheduleNext();
      },
      MINUTE - (Date.now() % MINUTE),
    );
  };

  scheduleNext();
  return () => clearTimeout(timer);
}
