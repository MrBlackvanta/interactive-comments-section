import { SEED } from "@/data";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { seedThread } from "./thread";
import { createThreadStore, STORAGE_KEY } from "./thread-store";
import { DAY, PRERENDER_TIME } from "./time";

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

describe("createThreadStore", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ now: NOW });
  });
  afterEach(() => vi.useRealTimers());

  it("seeds a first visit relative to now and saves it", () => {
    const thread = createThreadStore().getSnapshot();

    expect(thread).toEqual(seedThread(SEED, NOW));
    expect(saved()).toEqual(thread);
  });

  it("restores the saved thread on a later visit, so the seed keeps ageing", () => {
    createThreadStore().getSnapshot();
    vi.setSystemTime(NOW + 3 * DAY);

    expect(createThreadStore().getSnapshot()).toEqual(seedThread(SEED, NOW));
  });

  it("sorts a saved thread by score on load", () => {
    const [top, second] = seedThread(SEED, NOW);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([second, top]));

    expect(
      createThreadStore()
        .getSnapshot()
        .map(({ id }) => id),
    ).toEqual([top.id, second.id]);
  });

  it("keeps an emptied thread empty", () => {
    localStorage.setItem(STORAGE_KEY, "[]");

    expect(createThreadStore().getSnapshot()).toEqual([]);
  });

  it("returns the same snapshot until something changes", () => {
    const store = createThreadStore();

    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });

  it("replaces a corrupt save with a fresh seed", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");

    const thread = createThreadStore().getSnapshot();

    expect(thread).toEqual(seedThread(SEED, NOW));
    expect(saved()).toEqual(thread);
  });

  it("still serves the thread when storage refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    expect(createThreadStore().getSnapshot()).toEqual(seedThread(SEED, NOW));
  });

  it("still serves the thread when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(createThreadStore().getSnapshot()).toEqual(seedThread(SEED, NOW));
  });

  it("prerenders the seed at a fixed time, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "[]");

    expect(createThreadStore().getServerSnapshot()).toEqual(
      seedThread(SEED, PRERENDER_TIME),
    );
  });
});
