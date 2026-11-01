"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import CommentCard from "./comment-card";
import CommentForm from "./comment-form";
import { useNow } from "./use-now";
import { useThread } from "./use-thread";

function reveal(element: Element | null | undefined) {
  const motionSafe = matchMedia(
    "(prefers-reduced-motion: no-preference)",
  ).matches;
  element?.scrollIntoView({
    block: "nearest",
    behavior: motionSafe ? "smooth" : "instant",
  });
}

export default function CommentThread() {
  const { comments, vote, add } = useThread();
  const now = useNow();
  const listRef = useRef<HTMLOListElement>(null);
  const [sent, setSent] = useState(0);

  const send = (content: string) => {
    flushSync(() => add(content));
    reveal(listRef.current?.lastElementChild);
    setSent((count) => count + 1);
  };

  return (
    <div className="mx-auto flex max-w-thread flex-col gap-4 md:gap-5">
      <ol
        ref={listRef}
        aria-label="Comments"
        className="flex flex-col gap-4 md:gap-5"
      >
        {comments.map((comment) => (
          <li key={comment.id} className="flex flex-col gap-4 md:gap-5">
            <CommentCard post={comment} now={now} onVote={vote} />
            {comment.replies.length > 0 && (
              <ol
                aria-label={`Replies to ${comment.username}`}
                className="flex flex-col gap-4 border-l-2 border-line pl-4 md:ml-10.75 md:gap-5 md:pl-10.75"
              >
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentCard post={reply} now={now} onVote={vote} />
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
      <CommentForm onSend={send} />
      <output aria-live="polite" className="sr-only">
        {sent > 0 && <span key={sent}>Comment sent</span>}
      </output>
    </div>
  );
}
