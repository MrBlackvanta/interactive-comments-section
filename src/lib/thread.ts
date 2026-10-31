import {
  AVATARS,
  type Comment,
  type Reply,
  type SeedComment,
  type Username,
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

function dated<T extends { daysAgo: number }>(
  { daysAgo, ...post }: T,
  now: number,
) {
  return { ...post, createdAt: now - daysAgo * DAY };
}

export function seedThread(seed: SeedComment[], now: number): Comment[] {
  return sortThread(
    seed.map(({ replies, ...comment }) => ({
      ...dated(comment, now),
      replies: replies.map((reply) => dated(reply, now)),
    })),
  );
}

type Fields = Record<string, unknown>;

const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null;

const isUsername = (value: unknown): value is Username =>
  typeof value === "string" && Object.hasOwn(AVATARS, value);

const isPost = (value: Fields) =>
  Number.isInteger(value.id) &&
  isUsername(value.username) &&
  typeof value.content === "string" &&
  Number.isInteger(value.score) &&
  Number.isFinite(value.createdAt);

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
