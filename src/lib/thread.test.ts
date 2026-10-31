import type { Comment, Reply } from "@/data";
import { describe, expect, it } from "vite-plus/test";
import {
  castVote,
  parseThread,
  seedThread,
  sortThread,
  toggleVote,
} from "./thread";
import { DAY } from "./time";

const reply = (overrides: Partial<Reply> = {}): Reply => ({
  id: 10,
  username: "juliusomo",
  content: "A reply",
  score: 0,
  createdAt: 0,
  vote: 0,
  replyingTo: "maxblagun",
  ...overrides,
});

const comment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 1,
  username: "maxblagun",
  content: "A comment",
  score: 0,
  createdAt: 0,
  vote: 0,
  replies: [],
  ...overrides,
});

const ids = (comments: { id: number }[]) => comments.map(({ id }) => id);

describe("sortThread", () => {
  it.each([
    [
      "highest score first",
      [comment({ id: 1, score: 2 }), comment({ id: 2, score: 9 })],
      [2, 1],
    ],
    [
      "older first on a tied score",
      [comment({ id: 1, createdAt: 5 }), comment({ id: 2, createdAt: 3 })],
      [2, 1],
    ],
    [
      "negative scores below zero",
      [comment({ id: 1, score: -1 }), comment({ id: 2, score: 0 })],
      [2, 1],
    ],
  ])("orders comments %s", (_, comments, expected) => {
    expect(ids(sortThread(comments))).toEqual(expected);
  });

  it("orders replies oldest first, whatever their score", () => {
    const [sorted] = sortThread([
      comment({
        replies: [
          reply({ id: 1, createdAt: 9, score: 0 }),
          reply({ id: 2, createdAt: 1, score: 0 }),
          reply({ id: 3, createdAt: 5, score: 50 }),
        ],
      }),
    ]);

    expect(ids(sorted.replies)).toEqual([2, 3, 1]);
  });

  it("leaves the input untouched", () => {
    const input = [comment({ id: 1, score: 1 }), comment({ id: 2, score: 2 })];

    sortThread(input);

    expect(ids(input)).toEqual([1, 2]);
  });
});

describe("seedThread", () => {
  it("dates every item back from now, leaves it unvoted and sorts the result", () => {
    const now = 100 * DAY;
    const thread = seedThread(
      [
        {
          id: 1,
          username: "maxblagun",
          content: "",
          score: 1,
          daysAgo: 3,
          replies: [],
        },
        {
          id: 2,
          username: "amirrobson",
          content: "",
          score: 7,
          daysAgo: 30,
          replies: [
            {
              id: 3,
              username: "juliusomo",
              content: "",
              score: 0,
              daysAgo: 1,
              replyingTo: "amirrobson",
            },
          ],
        },
      ],
      now,
    );

    expect(thread).toEqual([
      expect.objectContaining({
        id: 2,
        createdAt: 70 * DAY,
        vote: 0,
        replies: [
          expect.objectContaining({ id: 3, createdAt: 99 * DAY, vote: 0 }),
        ],
      }),
      expect.objectContaining({ id: 1, createdAt: 97 * DAY, vote: 0 }),
    ]);
    expect(thread[0]).not.toHaveProperty("daysAgo");
    expect(thread[0].replies[0]).not.toHaveProperty("daysAgo");
  });
});

describe("toggleVote", () => {
  it.each([
    ["an upvote raises the score by one", 0, 5, 1, 1, 6],
    ["a downvote lowers it by one", 0, 5, -1, -1, 4],
    ["a downvote can take it below zero", 0, 0, -1, -1, -1],
    ["repeating an upvote undoes it", 1, 6, 1, 0, 5],
    ["repeating a downvote undoes it", -1, 4, -1, 0, 5],
    ["switching up to down moves it by two", 1, 6, -1, -1, 4],
    ["switching down to up moves it by two", -1, 4, 1, 1, 6],
  ] as const)(
    "%s",
    (_, vote, score, direction, expectedVote, expectedScore) => {
      expect(toggleVote(reply({ vote, score }), direction)).toEqual(
        reply({ vote: expectedVote, score: expectedScore }),
      );
    },
  );

  it("leaves the original post untouched", () => {
    const post = reply();

    toggleVote(post, 1);

    expect(post).toEqual(reply());
  });
});

describe("castVote", () => {
  const thread = [
    comment({ id: 1, score: 3 }),
    comment({
      id: 2,
      score: 3,
      replies: [reply({ id: 3, score: 1 }), reply({ id: 4, score: 1 })],
    }),
  ];

  it("votes on the comment with that id", () => {
    expect(castVote(thread, 1, 1)[0]).toEqual(
      comment({ id: 1, score: 4, vote: 1 }),
    );
  });

  it("votes on the reply with that id and on nothing else", () => {
    const [, parent] = castVote(thread, 4, -1);

    expect(parent).toMatchObject({ score: 3, vote: 0 });
    expect(parent.replies).toEqual([
      reply({ id: 3, score: 1 }),
      reply({ id: 4, score: 0, vote: -1 }),
    ]);
  });

  it("keeps every untouched comment as it was", () => {
    const next = castVote(thread, 3, 1);

    expect(next[0]).toBe(thread[0]);
    expect(next[1].replies[1]).toBe(thread[1].replies[1]);
  });

  it("never reorders, even when a vote overtakes", () => {
    expect(ids(castVote(thread, 2, 1))).toEqual([1, 2]);
  });
});

describe("parseThread", () => {
  const valid = comment({ replies: [reply()] });

  it.each([
    ["an empty thread", "[]", []],
    ["a full thread", JSON.stringify([valid]), [valid]],
    [
      "votes in either direction",
      JSON.stringify([{ ...valid, vote: -1, replies: [reply({ vote: 1 })] }]),
      [{ ...valid, vote: -1, replies: [reply({ vote: 1 })] }],
    ],
  ])("accepts %s", (_, json, expected) => {
    expect(parseThread(json)).toEqual(expected);
  });

  it.each([
    ["nothing saved", null],
    ["an empty string", ""],
    ["malformed JSON", "[{"],
    ["an object instead of a list", "{}"],
    ["a list of non-objects", "[1]"],
    ["a null comment", "[null]"],
    ["a string id", JSON.stringify([{ ...valid, id: "1" }])],
    ["a fractional score", JSON.stringify([{ ...valid, score: 1.5 }])],
    ["a missing content", JSON.stringify([{ ...valid, content: undefined }])],
    [
      "a non-numeric date",
      JSON.stringify([{ ...valid, createdAt: "1 month ago" }]),
    ],
    [
      "an unknown author",
      JSON.stringify([{ ...valid, username: "amyrobson" }]),
    ],
    [
      "an inherited key as the author",
      JSON.stringify([{ ...valid, username: "toString" }]),
    ],
    ["missing replies", JSON.stringify([{ ...valid, replies: undefined }])],
    ["a missing vote", JSON.stringify([{ ...valid, vote: undefined }])],
    ["a vote worth two", JSON.stringify([{ ...valid, vote: 2 }])],
    ["a vote written as text", JSON.stringify([{ ...valid, vote: "1" }])],
    [
      "a reply without a target",
      JSON.stringify([
        { ...valid, replies: [{ ...reply(), replyingTo: undefined }] },
      ]),
    ],
    [
      "a reply to an unknown user",
      JSON.stringify([
        { ...valid, replies: [reply({ replyingTo: "nobody" as never })] },
      ]),
    ],
    [
      "a reply with an invalid vote",
      JSON.stringify([{ ...valid, replies: [{ ...reply(), vote: 0.5 }] }]),
    ],
    [
      "a reply missing its id",
      JSON.stringify([{ ...valid, replies: [{ ...reply(), id: undefined }] }]),
    ],
  ])("rejects %s", (_, json) => {
    expect(parseThread(json)).toBeNull();
  });
});
