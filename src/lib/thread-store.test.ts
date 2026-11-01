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
import {
  clearSavedThread,
  createThreadStore,
  STORAGE_KEY,
} from "./thread-store";
import { DAY, PRERENDER_TIME } from "./time";

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

const saved = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");

const fromOtherTab = (
  newValue: string | null,
  key: string | null = STORAGE_KEY,
) => window.dispatchEvent(new StorageEvent("storage", { key, newValue }));

const ids = (comments: { id: number }[]) => comments.map(({ id }) => id);

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

  it("forgets the saved thread, so the next visit starts from a fresh seed", () => {
    localStorage.setItem("unrelated", "kept");
    createThreadStore().update(() => []);
    clearSavedThread();
    vi.setSystemTime(NOW + 3 * DAY);

    expect(saved()).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("kept");
    expect(createThreadStore().getSnapshot()).toEqual(
      seedThread(SEED, NOW + 3 * DAY),
    );
  });

  it("carries on when storage refuses to forget the thread", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(clearSavedThread).not.toThrow();
  });

  it("still serves the thread when storage cannot be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });

    expect(createThreadStore().getSnapshot()).toEqual(seedThread(SEED, NOW));
  });

  it("publishes an update to subscribers and saves it", () => {
    const store = createThreadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.update((thread) => thread.slice(1));

    expect(listener).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).toHaveLength(1);
    expect(saved()).toEqual(store.getSnapshot());
  });

  it("applies each update to the thread the last one left", () => {
    const store = createThreadStore();

    store.update((thread) => thread.slice(1));
    store.update((thread) => thread.slice(1));

    expect(store.getSnapshot()).toEqual([]);
  });

  it("keeps an update in memory when storage refuses to save it", () => {
    const store = createThreadStore();
    store.getSnapshot();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    store.update(() => []);

    expect(store.getSnapshot()).toEqual([]);
  });

  it("takes another tab's save as it stands, without re-sorting it", () => {
    const store = createThreadStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const [top, second] = seedThread(SEED, NOW);

    fromOtherTab(JSON.stringify([second, top]));

    expect(ids(store.getSnapshot())).toEqual([second.id, top.id]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it.each([
    ["another key", "[]", "other:key"],
    ["a removal", null, STORAGE_KEY],
    ["a cleared storage", null, null],
    ["a corrupt save", "{not json", STORAGE_KEY],
  ])("ignores %s from another tab", (_, newValue, key) => {
    const store = createThreadStore();
    const before = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe(listener);

    fromOtherTab(newValue, key);

    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops following other tabs once the last subscriber leaves", () => {
    const store = createThreadStore();
    const before = store.getSnapshot();

    store.subscribe(() => {})();
    fromOtherTab("[]");

    expect(store.getSnapshot()).toBe(before);
  });

  it("keeps following other tabs while any subscriber remains", () => {
    const store = createThreadStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.subscribe(() => {})();
    fromOtherTab("[]");

    expect(store.getSnapshot()).toEqual([]);
    expect(listener).toHaveBeenCalledOnce();
  });

  it("prerenders the seed at a fixed time, ignoring storage", () => {
    localStorage.setItem(STORAGE_KEY, "[]");

    expect(createThreadStore().getServerSnapshot()).toEqual(
      seedThread(SEED, PRERENDER_TIME),
    );
  });
});
