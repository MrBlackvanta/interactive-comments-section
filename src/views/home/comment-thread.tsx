"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import CommentForm from "./comment-form";
import CommentItem from "./comment-item";
import { reveal } from "./reveal";
import { useNow } from "./use-now";
import { useThread } from "./use-thread";

export default function CommentThread() {
  const { comments, vote, add, reply, edit } = useThread();
  const now = useNow();
  const listRef = useRef<HTMLOListElement>(null);
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
          />
        ))}
      </ol>
      <CommentForm label="Add a comment" submit="Send" onSend={send} />
      <output aria-live="polite" className="sr-only">
        {status.count > 0 && <span key={status.count}>{status.message}</span>}
      </output>
    </div>
  );
}
