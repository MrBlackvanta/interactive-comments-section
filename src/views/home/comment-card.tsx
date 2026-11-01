import { EditIcon, ReplyIcon } from "@/components/icons";
import {
  AVATARS,
  CURRENT_USER,
  type Direction,
  type Post,
  type Username,
} from "@/data";
import { timeAgo } from "@/lib";
import { useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import CommentForm from "./comment-form";
import EditForm from "./edit-form";
import VotePill from "./vote-pill";

type CommentCardProps = {
  post: Post & { replyingTo?: Username };
  now: number;
  onVote: (id: number, direction: Direction) => void;
  onReply: (id: number, content: string) => void;
  onEdit: (id: number, content: string) => void;
};

const body = "col-span-2 md:col-start-2 md:row-start-2";

const action =
  "col-start-2 row-start-3 flex items-center gap-2 self-center justify-self-end text-body-m-bold text-accent v-focus transition-[color] duration-150 ease-out hover:text-accent-soft md:col-start-3 md:row-start-1";

export default function CommentCard({
  post,
  now,
  onVote,
  onReply,
  onEdit,
}: CommentCardProps) {
  const id = useId();
  const authorId = `${id}-author`;
  const ageId = `${id}-age`;
  const own = post.username === CURRENT_USER;
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const replyButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);

  const closeReply = () => {
    setReplying(false);
    replyButton.current?.focus();
  };

  const sendReply = (content: string) => {
    setReplying(false);
    onReply(post.id, content);
  };

  const closeEdit = () => {
    flushSync(() => setEditing(false));
    editButton.current?.focus();
  };

  const saveEdit = (content: string) => {
    onEdit(post.id, content);
    closeEdit();
  };

  return (
    <div className="flex flex-col gap-2">
      <article
        aria-labelledby={`${authorId} ${ageId}`}
        tabIndex={-1}
        className="grid scroll-m-1 grid-cols-[auto_1fr] gap-4 rounded-lg bg-white p-4 v-focus md:grid-cols-[auto_1fr_auto] md:grid-rows-[auto_1fr] md:gap-x-6 md:p-6"
      >
        <header className="col-span-2 flex items-center gap-4 md:col-span-1 md:col-start-2 md:row-start-1">
          <img
            src={AVATARS[post.username].src}
            alt=""
            width={32}
            height={32}
            className="size-8"
          />
          <div className="flex flex-wrap items-center gap-x-4">
            <span id={authorId} className="flex items-center gap-2">
              <span className="text-heading-m text-ink">{post.username}</span>{" "}
              {own && (
                <span className="rounded-xs bg-accent px-1.5 py-0.5 text-badge text-white">
                  you
                </span>
              )}
            </span>
            <time id={ageId} dateTime={new Date(post.createdAt).toISOString()}>
              {timeAgo(post.createdAt, now)}
            </time>
          </div>
        </header>
        {editing ? (
          <EditForm
            post={post}
            className={body}
            onSave={saveEdit}
            onCancel={closeEdit}
          />
        ) : (
          <p className={`${body} wrap-anywhere whitespace-pre-line`}>
            {post.replyingTo && (
              <>
                <span className="font-medium text-accent">
                  @{post.replyingTo}
                </span>{" "}
              </>
            )}
            {post.content}
          </p>
        )}
        <VotePill
          score={post.score}
          vote={post.vote}
          onVote={(direction) => onVote(post.id, direction)}
        />
        {own ? (
          <button
            ref={editButton}
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing((open) => !open)}
            className={action}
          >
            <EditIcon />
            Edit
          </button>
        ) : (
          <button
            ref={replyButton}
            type="button"
            aria-expanded={replying}
            onClick={() => setReplying((open) => !open)}
            className={action}
          >
            <ReplyIcon />
            Reply
          </button>
        )}
      </article>
      {replying && (
        <CommentForm
          label={`Reply to @${post.username}`}
          submit="Reply"
          mention={post.username}
          autoFocus
          onSend={sendReply}
          onCancel={closeReply}
        />
      )}
    </div>
  );
}
