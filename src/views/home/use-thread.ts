import { createThreadStore } from "@/lib";
import { useState, useSyncExternalStore } from "react";

export function useThread() {
  const [store] = useState(createThreadStore);
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}
