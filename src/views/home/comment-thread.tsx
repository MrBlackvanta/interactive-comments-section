"use client";

import { readingOrder } from "@/lib";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import CommentForm from "./comment-form";
import CommentItem from "./comment-item";
import DeleteDialog from "./delete-dialog";
import { reveal } from "./reveal";
import { useNow } from "./use-now";
import { useThread } from "./use-thread";

export default function CommentThread() {
  const { comments, vote, add, reply, edit, remove } = useThread();
  const now = useNow();
  const listRef = useRef<HTMLOListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingDelete = useRef<number>(null);
  const [status, setStatus] = useState({ message: "", count: 0 });

  const announce = (message: string) =>
    setStatus(({ count }) => ({ message, count: count + 1 }));

  const send = (content: string) => {
    flushSync(() => add(content));
    reveal(listRef.current?.lastElementChild);
    announce("Comment sent");
  };

  const sendReply = (id: number, content: string) => {
    reply(id, content);
    announce("Reply sent");
  };

  const saveEdit = (id: number, content: string) => {
    edit(id, content);
    announce("Comment updated");
  };

  const askDelete = (id: number) => {
    pendingDelete.current = id;
    dialogRef.current?.showModal();
  };

  const confirmDelete = () => {
    const dialog = dialogRef.current;
    const id = pendingDelete.current;
    if (!dialog?.open || id === null) return;

    const index = readingOrder(comments).findIndex((post) => post.id === id);
    flushSync(() => remove(id));
    dialog.close();

    const cards = listRef.current?.querySelectorAll("article");
    const neighbour = cards?.item(index) ?? cards?.item(index - 1);
    neighbour?.focus({ preventScroll: true });
    reveal(neighbour);
    announce("Comment deleted");
  };

  return (
    <div className="mx-auto flex max-w-thread flex-col gap-4 md:gap-5">
      <ol
        ref={listRef}
        aria-label="Comments"
        className="flex flex-col gap-4 md:gap-5"
      >
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            now={now}
            onVote={vote}
            onReply={sendReply}
            onEdit={saveEdit}
            onDelete={askDelete}
          />
        ))}
      </ol>
      <CommentForm label="Add a comment" submit="Send" onSend={send} />
      <output aria-live="polite" className="sr-only">
        {status.count > 0 && <span key={status.count}>{status.message}</span>}
      </output>
      <DeleteDialog
        ref={dialogRef}
        onCancel={() => dialogRef.current?.close()}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
