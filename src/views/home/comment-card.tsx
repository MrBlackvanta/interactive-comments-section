import {
  AVATARS,
  CURRENT_USER,
  type Direction,
  type Post,
  type Username,
} from "@/data";
import { timeAgo } from "@/lib";
import { useId } from "react";
import VotePill from "./vote-pill";

type CommentCardProps = {
  post: Post & { replyingTo?: Username };
  now: number;
  onVote: (id: number, direction: Direction) => void;
};

export default function CommentCard({ post, now, onVote }: CommentCardProps) {
  const id = useId();
  const authorId = `${id}-author`;
  const ageId = `${id}-age`;

  return (
    <article
      aria-labelledby={`${authorId} ${ageId}`}
      className="grid grid-cols-[auto_1fr] gap-4 rounded-lg bg-white p-4 md:grid-cols-[auto_1fr_auto] md:grid-rows-[auto_1fr] md:gap-x-6 md:p-6"
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
            {post.username === CURRENT_USER && (
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
      <p className="col-span-2 wrap-anywhere whitespace-pre-line md:col-start-2 md:row-start-2">
        {post.replyingTo && (
          <>
            <span className="font-medium text-accent">
              @{post.replyingTo}
            </span>{" "}
          </>
        )}
        {post.content}
      </p>
      <VotePill
        score={post.score}
        vote={post.vote}
        onVote={(direction) => onVote(post.id, direction)}
      />
    </article>
  );
}
