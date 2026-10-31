import type { Comment } from "@/data";
import { castVote, DAY, MINUTE, STORAGE_KEY } from "@/lib";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import CommentThread from "./comment-thread";

const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

const save = (comments: Comment[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));

const comment = (overrides: Partial<Comment>): Comment => ({
  id: 1,
  username: "maxblagun",
  content: "A comment",
  score: 0,
  createdAt: NOW,
  vote: 0,
  replies: [],
  ...overrides,
});

const pill = (name: string) => {
  const card = screen.getByRole("article", { name });
  return {
    up: within(card).getByRole("button", { name: "Upvote" }),
    down: within(card).getByRole("button", { name: "Downvote" }),
    score: within(card).getByText(/^-?\d+$/),
  };
};

const setup = () => userEvent.setup({ delay: null });

describe("CommentThread", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("lists top-level comments highest score first, each named by author and age", () => {
    render(<CommentThread />);

    const thread = screen.getByRole("list", { name: "Comments" });
    const [first, second] = within(thread).getAllByRole("listitem");

    expect(within(first).getAllByRole("article")[0]).toHaveAccessibleName(
      "amirrobson 1 month ago",
    );
    expect(within(second).getAllByRole("article")[0]).toHaveAccessibleName(
      "maxblagun 2 weeks ago",
    );
  });

  it("nests replies under their comment, oldest first, each naming who it answers", () => {
    render(<CommentThread />);

    const replies = within(
      screen.getByRole("list", { name: "Replies to maxblagun" }),
    ).getAllByRole("article");

    expect(replies).toHaveLength(2);
    expect(replies[0]).toHaveAccessibleName("ramsesmiron 1 week ago");
    expect(
      within(replies[0]).getByText("@maxblagun").parentElement,
    ).toHaveTextContent(/^@maxblagun If you're still new/);
    expect(
      within(replies[1]).getByText("@ramsesmiron").parentElement,
    ).toHaveTextContent(/^@ramsesmiron I couldn't agree more/);
  });

  it("marks only the current user's items as theirs", () => {
    render(<CommentThread />);

    const badge = screen.getByText("you");
    const own = badge.closest("article");

    expect(own).toHaveAccessibleName("juliusomo you 2 days ago");
    expect(screen.getAllByText("you")).toHaveLength(1);
  });

  it("gives each age a machine-readable timestamp", () => {
    render(<CommentThread />);

    expect(screen.getByText("1 month ago")).toHaveAttribute(
      "datetime",
      new Date(NOW - 30 * DAY).toISOString(),
    );
  });

  it("states each score in words and keeps avatars out of the accessibility tree", () => {
    render(<CommentThread />);

    const [top] = screen.getAllByRole("article");

    expect(within(top).getByText("12")).toHaveTextContent("Score 12");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("restores the thread saved on an earlier visit", () => {
    save([comment({ username: "ramsesmiron", content: "Saved earlier" })]);

    render(<CommentThread />);

    expect(screen.getByText("Saved earlier")).toBeInTheDocument();
    expect(screen.queryByText(/^Impressive!/)).not.toBeInTheDocument();
  });

  it("falls back to the seed when the saved thread is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");

    render(<CommentThread />);

    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("re-reads every age as each minute passes", () => {
    vi.useFakeTimers({ now: NOW });
    save([comment({ createdAt: NOW - 30_000 })]);
    render(<CommentThread />);

    expect(screen.getByText("just now")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(MINUTE);
    });

    expect(screen.getByText("1 minute ago")).toBeInTheDocument();
  });

  it("offers an unpressed upvote and downvote on every item", () => {
    render(<CommentThread />);

    for (const card of screen.getAllByRole("article")) {
      expect(
        within(card).getByRole("button", { name: "Upvote", pressed: false }),
      ).toBeInTheDocument();
      expect(
        within(card).getByRole("button", { name: "Downvote", pressed: false }),
      ).toBeInTheDocument();
    }
  });

  it("raises the score on an upvote and undoes it on a second click", async () => {
    const user = setup();
    render(<CommentThread />);
    const { up, score } = pill("amirrobson 1 month ago");

    await user.click(up);

    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(score).toHaveTextContent("Score 13");

    await user.click(up);

    expect(up).toHaveAttribute("aria-pressed", "false");
    expect(score).toHaveTextContent("Score 12");
  });

  it("moves the score by two when a vote switches direction", async () => {
    const user = setup();
    render(<CommentThread />);
    const { up, down, score } = pill("ramsesmiron 1 week ago");

    await user.click(down);
    expect(score).toHaveTextContent("Score 3");

    await user.click(up);

    expect(score).toHaveTextContent("Score 5");
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(down).toHaveAttribute("aria-pressed", "false");
  });

  it("counts rapid clicks against the latest score", () => {
    render(<CommentThread />);
    const { up, score } = pill("amirrobson 1 month ago");

    act(() => {
      up.click();
      up.click();
    });

    expect(score).toHaveTextContent("Score 12");
    expect(up).toHaveAttribute("aria-pressed", "false");
  });

  it("holds the order when a vote overtakes, then re-sorts on the next visit", async () => {
    save([
      comment({
        id: 1,
        username: "amirrobson",
        score: 1,
        createdAt: NOW - DAY,
      }),
      comment({ id: 2, username: "maxblagun", score: 1 }),
    ]);
    const user = setup();
    const { unmount } = render(<CommentThread />);

    await user.click(pill("maxblagun just now").up);

    expect(screen.getAllByRole("article")[0]).toHaveAccessibleName(
      "amirrobson 1 day ago",
    );

    unmount();
    render(<CommentThread />);

    expect(screen.getAllByRole("article")[0]).toHaveAccessibleName(
      "maxblagun just now",
    );
  });

  it("remembers a vote on the next visit", async () => {
    const user = setup();
    const { unmount } = render(<CommentThread />);
    await user.click(pill("juliusomo you 2 days ago").down);

    unmount();
    render(<CommentThread />);

    const { down, score } = pill("juliusomo you 2 days ago");
    expect(down).toHaveAttribute("aria-pressed", "true");
    expect(score).toHaveTextContent("Score 1");
  });

  it("shows a vote cast in another tab", () => {
    render(<CommentThread />);
    const thread = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify(castVote(thread, 1, 1)),
        }),
      );
    });

    const { up, score } = pill("amirrobson 1 month ago");
    expect(up).toHaveAttribute("aria-pressed", "true");
    expect(score).toHaveTextContent("Score 13");
  });

  it("prerenders the same seed whatever the build clock or storage says", () => {
    const early = renderToString(<CommentThread />);

    save([]);
    vi.setSystemTime(NOW + 400 * DAY);
    const late = renderToString(<CommentThread />);

    expect(late).toBe(early);
    expect(early).toContain("1 month ago");
  });
});
