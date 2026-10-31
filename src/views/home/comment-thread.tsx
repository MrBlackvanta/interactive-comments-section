"use client";

import CommentCard from "./comment-card";
import { useNow } from "./use-now";
import { useThread } from "./use-thread";

export default function CommentThread() {
  const { comments, vote } = useThread();
  const now = useNow();

  return (
    <ol
      aria-label="Comments"
      className="mx-auto flex max-w-thread flex-col gap-4 md:gap-5"
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
  );
}
