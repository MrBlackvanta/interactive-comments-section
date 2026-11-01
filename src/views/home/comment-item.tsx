import type { Comment, Direction } from "@/data";
import { useRef } from "react";
import { flushSync } from "react-dom";
import CommentCard from "./comment-card";
import { reveal } from "./reveal";

type CommentItemProps = {
  comment: Comment;
  now: number;
  onVote: (id: number, direction: Direction) => void;
  onReply: (id: number, content: string) => void;
  onEdit: (id: number, content: string) => void;
};

export default function CommentItem({
  comment,
  now,
  onVote,
  onReply,
  onEdit,
}: CommentItemProps) {
  const repliesRef = useRef<HTMLOListElement>(null);

  const reply = (id: number, content: string) => {
    flushSync(() => onReply(id, content));
    const added =
      repliesRef.current?.lastElementChild?.querySelector("article");
    added?.focus({ preventScroll: true });
    reveal(added);
  };

  return (
    <li className="flex flex-col gap-4 md:gap-5">
      <CommentCard
        post={comment}
        now={now}
        onVote={onVote}
        onReply={reply}
        onEdit={onEdit}
      />
      {comment.replies.length > 0 && (
        <ol
          ref={repliesRef}
          aria-label={`Replies to ${comment.username}`}
          className="flex flex-col gap-4 border-l-2 border-line pl-4 md:ml-10.75 md:gap-5 md:pl-10.75"
        >
          {comment.replies.map((post) => (
            <li key={post.id}>
              <CommentCard
                post={post}
                now={now}
                onVote={onVote}
                onReply={reply}
                onEdit={onEdit}
              />
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
