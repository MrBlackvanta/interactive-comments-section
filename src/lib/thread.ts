import {
  AVATARS,
  type Comment,
  type Direction,
  type Post,
  type Reply,
  type SeedComment,
  type Username,
  type Vote,
} from "@/data";
import { DAY } from "./time";

const byScore = (a: Comment, b: Comment) =>
  b.score - a.score || a.createdAt - b.createdAt;

const byAge = (a: Reply, b: Reply) => a.createdAt - b.createdAt;

export function sortThread(comments: Comment[]) {
  return comments
    .map((comment) => ({
      ...comment,
      replies: comment.replies.toSorted(byAge),
    }))
    .toSorted(byScore);
}

function toPost<T extends { daysAgo: number }>(
  { daysAgo, ...post }: T,
  now: number,
) {
  return { ...post, createdAt: now - daysAgo * DAY, vote: 0 as const };
}

export function seedThread(seed: SeedComment[], now: number): Comment[] {
  return sortThread(
    seed.map(({ replies, ...comment }) => ({
      ...toPost(comment, now),
      replies: replies.map((reply) => toPost(reply, now)),
    })),
  );
}

type Change = <T extends Post>(post: T) => T;

function updatePost(comments: Comment[], id: number, change: Change) {
  return comments.map((comment) => {
    if (comment.id === id) return change(comment);
    if (!comment.replies.some((reply) => reply.id === id)) return comment;

    return {
      ...comment,
      replies: comment.replies.map((reply) =>
        reply.id === id ? change(reply) : reply,
      ),
    };
  });
}

export function toggleVote<T extends Post>(post: T, direction: Direction): T {
  const vote = post.vote === direction ? 0 : direction;
  return { ...post, vote, score: post.score - post.vote + vote };
}

export function castVote(
  comments: Comment[],
  id: number,
  direction: Direction,
) {
  return updatePost(comments, id, (post) => toggleVote(post, direction));
}

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null;

const isUsername = (value: unknown): value is Username =>
  typeof value === "string" && Object.hasOwn(AVATARS, value);

const isVote = (value: unknown): value is Vote =>
  value === 1 || value === 0 || value === -1;

const isPost = (value: Fields) =>
  Number.isInteger(value.id) &&
  isUsername(value.username) &&
  typeof value.content === "string" &&
  Number.isInteger(value.score) &&
  Number.isFinite(value.createdAt) &&
  isVote(value.vote);

const isReply = (value: unknown): value is Reply =>
  isRecord(value) && isPost(value) && isUsername(value.replyingTo);

const isComment = (value: unknown): value is Comment =>
  isRecord(value) &&
  isPost(value) &&
  Array.isArray(value.replies) &&
  value.replies.every(isReply);

export function parseThread(json: string | null): Comment[] | null {
  if (json === null) return null;

  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) && value.every(isComment) ? value : null;
  } catch {
    return null;
  }
}
