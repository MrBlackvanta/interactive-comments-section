import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import {
  currentMinute,
  DAY,
  HOUR,
  MINUTE,
  subscribeToMinutes,
  timeAgo,
} from "./time";

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const SECOND = 1000;

describe("timeAgo", () => {
  it.each([
    [-5 * SECOND, "just now"],
    [0, "just now"],
    [59 * SECOND, "just now"],
    [MINUTE, "1 minute ago"],
    [59 * MINUTE, "59 minutes ago"],
    [HOUR, "1 hour ago"],
    [23 * HOUR + 59 * MINUTE, "23 hours ago"],
    [DAY, "1 day ago"],
    [6 * DAY, "6 days ago"],
    [7 * DAY, "1 week ago"],
    [14 * DAY, "2 weeks ago"],
    [29 * DAY, "4 weeks ago"],
    [30 * DAY, "1 month ago"],
    [364 * DAY, "12 months ago"],
    [365 * DAY, "1 year ago"],
    [800 * DAY, "2 years ago"],
  ])("reads %ims of age as %s", (age, label) => {
    expect(timeAgo(NOW - age, NOW)).toBe(label);
  });
});

describe("the minute clock", () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW + 59_999 }));
  afterEach(() => vi.useRealTimers());

  it("reports the start of the current minute", () => {
    expect(currentMinute()).toBe(NOW);
  });

  it("ticks on each minute boundary until unsubscribed", () => {
    const onTick = vi.fn();
    const unsubscribe = subscribeToMinutes(onTick);

    vi.advanceTimersByTime(1);
    expect(onTick).toHaveBeenCalledTimes(1);
    expect(currentMinute()).toBe(NOW + MINUTE);

    vi.advanceTimersByTime(MINUTE);
    expect(onTick).toHaveBeenCalledTimes(2);

    unsubscribe();
    vi.advanceTimersByTime(5 * MINUTE);
    expect(onTick).toHaveBeenCalledTimes(2);
  });
});
