import { type Comment, SEED } from "@/data";
import { parseThread, seedThread, sortThread } from "./thread";
import { currentMinute, PRERENDER_TIME } from "./time";

export const STORAGE_KEY = "parley:thread";

const PRERENDERED_THREAD = seedThread(SEED, PRERENDER_TIME);

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(comments: Comment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch {}
}

function load() {
  const saved = parseThread(readSaved());
  if (saved) return sortThread(saved);

  const seeded = seedThread(SEED, currentMinute());
  save(seeded);
  return seeded;
}

export function createThreadStore() {
  let comments: Comment[] | undefined;
  const listeners = new Set<() => void>();

  const getSnapshot = () => (comments ??= load());

  const publish = (next: Comment[]) => {
    comments = next;
    for (const listener of listeners) listener();
  };

  const receive = ({ key, newValue }: StorageEvent) => {
    if (key !== STORAGE_KEY) return;

    const next = parseThread(newValue);
    if (next) publish(next);
  };

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      if (listeners.size === 1) window.addEventListener("storage", receive);

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("storage", receive);
        }
      };
    },
    getSnapshot,
    getServerSnapshot: () => PRERENDERED_THREAD,
    update: (recipe: (current: Comment[]) => Comment[]) => {
      const next = recipe(getSnapshot());
      publish(next);
      save(next);
    },
  };
}
