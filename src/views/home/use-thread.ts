import type { Direction } from "@/data";
import { addComment, addReply, castVote, createThreadStore } from "@/lib";
import { useState, useSyncExternalStore } from "react";

export function useThread() {
  const [store] = useState(createThreadStore);
  const comments = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const vote = (id: number, direction: Direction) =>
    store.update((current) => castVote(current, id, direction));

  const add = (content: string) =>
    store.update((current) => addComment(current, content, Date.now()));

  const reply = (id: number, content: string) =>
    store.update((current) => addReply(current, id, content, Date.now()));

  return { comments, vote, add, reply };
}
