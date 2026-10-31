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
    return true;
  } catch {
    return false;
  }
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

  return {
    subscribe: () => () => {},
    getSnapshot: () => (comments ??= load()),
    getServerSnapshot: () => PRERENDERED_THREAD,
  };
}
