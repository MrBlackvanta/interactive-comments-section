import { AVATARS, CURRENT_USER, type Post, type Username } from "@/data";
import { timeAgo } from "@/lib";
import { useId } from "react";

type CommentCardProps = {
  post: Post & { replyingTo?: Username };
  now: number;
};

export default function CommentCard({ post, now }: CommentCardProps) {
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
      <p className="col-span-2 md:col-start-2 md:row-start-2">
        {post.replyingTo && (
          <>
            <span className="font-medium text-accent">
              @{post.replyingTo}
            </span>{" "}
          </>
        )}
        {post.content}
      </p>
      <div className="row-start-3 grid h-10 w-25 grid-cols-3 place-items-center rounded-vote bg-page md:col-start-1 md:row-span-2 md:row-start-1 md:h-25 md:w-10 md:grid-cols-1 md:grid-rows-3">
        <p className="col-start-2 text-heading-m text-accent md:col-start-1 md:row-start-2">
          <span className="sr-only">Score </span>
          {post.score}
        </p>
      </div>
    </article>
  );
}
