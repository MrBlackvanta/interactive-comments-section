import type { Comment } from "@/data";
import { castVote, DAY, MINUTE, STORAGE_KEY } from "@/lib";
import { installMatchMedia } from "@/test/media";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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

const composer = () => ({
  field: screen.getByRole("textbox", { name: "Add a comment" }),
  send: screen.getByRole("button", { name: "Send" }),
});

const latest = () => screen.getAllByRole("article").at(-1)!;

type User = ReturnType<typeof setup>;

const replyButton = (name: string) =>
  within(screen.getByRole("article", { name })).getByRole("button", {
    name: "Reply",
  });

const replyForm = (author: string) => {
  const field = screen.getByRole<HTMLTextAreaElement>("textbox", {
    name: `Reply to @${author}`,
  });
  return {
    field,
    send: within(field.form!).getByRole("button", { name: "Reply" }),
  };
};

const openReply = async (user: User, name: string) => {
  await user.click(replyButton(name));
  return replyForm(name.split(" ")[0]);
};

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

  it("sends a trimmed comment to the end of the thread as yours, unvoted", async () => {
    const user = setup();
    render(<CommentThread />);
    const { field, send } = composer();

    await user.type(field, "  Nice work!  ");
    await user.click(send);

    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(latest()).toHaveAccessibleName("juliusomo you just now");
    expect(within(latest()).getByText("Nice work!")).toBeInTheDocument();
    expect(within(latest()).getByText("0")).toHaveTextContent("Score 0");
    expect(
      within(latest()).getAllByRole("button", { pressed: false }),
    ).toHaveLength(2);
    expect(field).toHaveValue("");
  });

  it("sends without the browser submitting the page away", async () => {
    let submit: Event | undefined;
    document.addEventListener("submit", (event) => (submit = event), {
      once: true,
    });
    const user = setup();
    render(<CommentThread />);

    await user.type(composer().field, "Stay");
    await user.click(composer().send);

    expect(submit?.defaultPrevented).toBe(true);
  });

  it.each([
    ["nothing", ""],
    ["only spaces and line breaks", "  {Enter}  "],
  ])("refuses to send %s", async (_, text) => {
    const user = setup();
    render(<CommentThread />);
    const { field, send } = composer();

    if (text) await user.type(field, text);
    await user.click(send);

    expect(field).toBeInvalid();
    expect(screen.getAllByRole("article")).toHaveLength(4);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("accepts the text again once a blank draft gets words", async () => {
    const user = setup();
    render(<CommentThread />);
    const { field, send } = composer();

    await user.type(field, "   ");
    await user.type(field, "Hello");
    await user.click(send);

    expect(within(latest()).getByText("Hello")).toBeInTheDocument();
  });

  it("keeps a sent comment on the next visit", async () => {
    const user = setup();
    const { unmount } = render(<CommentThread />);
    await user.type(composer().field, "Still here");
    await user.click(composer().send);

    unmount();
    render(<CommentThread />);

    expect(within(latest()).getByText("Still here")).toBeInTheDocument();
  });

  it.each([
    ["smoothly", ["(prefers-reduced-motion: no-preference)"], "smooth"],
    ["instantly when motion is reduced", [], "instant"],
  ])("scrolls the new comment into view %s", async (_, queries, behavior) => {
    installMatchMedia(queries);
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const user = setup();
    render(<CommentThread />);

    await user.type(composer().field, "Scroll to me");
    await user.click(composer().send);

    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll).toHaveBeenCalledWith({ block: "nearest", behavior });
    expect(scroll.mock.contexts[0]).toBe(latest().closest("li"));
  });

  it("announces every comment sent through an explicit live region, since Chromium gives <output> no status role", async () => {
    const user = setup();
    render(<CommentThread />);
    const status = screen.getByRole("status");

    await user.type(composer().field, "First");
    await user.click(composer().send);
    const first = status.firstElementChild;

    await user.type(composer().field, "Second");
    await user.click(composer().send);

    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/^Comment sent$/);
    expect(status.firstElementChild).not.toBe(first);
  });

  it("leaves focus where it was on load, with no reply form open", () => {
    render(<CommentThread />);

    expect(document.body).toHaveFocus();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("offers a collapsed Reply on everyone else's items and none on yours", () => {
    render(<CommentThread />);

    for (const card of screen.getAllByRole("article")) {
      const own = within(card).queryByText("you") !== null;
      const reply = within(card).queryByRole("button", { name: "Reply" });

      if (own) expect(reply).not.toBeInTheDocument();
      else expect(reply).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens a focused reply form with the mention typed and the caret after it", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field } = await openReply(user, "maxblagun 2 weeks ago");

    expect(replyButton("maxblagun 2 weeks ago")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(field).toHaveValue("@maxblagun ");
    expect(field).toHaveFocus();
    expect(field).toHaveAttribute("placeholder", "Reply to @maxblagun…");
    expect(field.selectionStart).toBe(field.value.length);
  });

  it.each([
    [
      "a comment with no replies yet",
      "amirrobson 1 month ago",
      "Replies to amirrobson",
      1,
    ],
    [
      "a reply, under its comment",
      "ramsesmiron 1 week ago",
      "Replies to maxblagun",
      3,
    ],
  ])(
    "answers %s at the end of its thread, naming who it answers",
    async (_, name, list, count) => {
      const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
      const user = setup();
      render(<CommentThread />);
      const author = name.split(" ")[0];

      const { field, send } = await openReply(user, name);
      await user.type(field, " Thanks! ");
      await user.click(send);

      const replies = within(
        screen.getByRole("list", { name: list }),
      ).getAllByRole("article");
      const added = replies.at(-1)!;
      expect(replies).toHaveLength(count);
      expect(added).toHaveAccessibleName("juliusomo you just now");
      expect(
        within(added).getByText(`@${author}`).parentElement,
      ).toHaveTextContent(new RegExp(`^@${author} Thanks!$`));
      expect(scroll).toHaveBeenCalledOnce();
      expect(scroll.mock.contexts[0]).toBe(added);
    },
  );

  it("closes the form after a reply and moves focus to the reply, leaving the scroll to the reveal", async () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const user = setup();
    render(<CommentThread />);

    const { field, send } = await openReply(user, "amirrobson 1 month ago");
    await user.type(field, "Thanks!");
    await user.click(send);

    const [added] = within(
      screen.getByRole("list", { name: "Replies to amirrobson" }),
    ).getAllByRole("article");
    expect(field).not.toBeInTheDocument();
    expect(added).toHaveFocus();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(replyButton("amirrobson 1 month ago")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("status")).toHaveTextContent(/^Reply sent$/);
  });

  it.each([
    ["only the mention", ""],
    ["the mention and line breaks", "{Enter}  "],
    ["nothing at all", "{Control>}a{/Control}{Backspace}"],
  ])("refuses to send a reply of %s", async (_, keys) => {
    const user = setup();
    render(<CommentThread />);

    const { field, send } = await openReply(user, "amirrobson 1 month ago");
    if (keys) await user.type(field, keys);
    await user.click(send);

    expect(field).toBeInvalid();
    expect(field).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("cancels a reply on Escape and returns focus to Reply", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field } = await openReply(user, "ramsesmiron 1 week ago");
    await user.type(field, "Never mind");
    await user.keyboard("{Escape}");

    expect(field).not.toBeInTheDocument();
    expect(replyButton("ramsesmiron 1 week ago")).toHaveFocus();
    expect(screen.getAllByRole("article")).toHaveLength(4);
  });

  it("keeps the form open when Escape only ends an IME composition", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field } = await openReply(user, "ramsesmiron 1 week ago");
    fireEvent.keyDown(field, { key: "Escape", isComposing: true });

    expect(field).toBeInTheDocument();
  });

  it("collapses the form when Reply is pressed again", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field } = await openReply(user, "amirrobson 1 month ago");
    await user.click(replyButton("amirrobson 1 month ago"));

    expect(field).not.toBeInTheDocument();
  });

  it("keeps several reply forms open at once, each with its own draft", async () => {
    const user = setup();
    render(<CommentThread />);

    const first = await openReply(user, "amirrobson 1 month ago");
    const second = await openReply(user, "ramsesmiron 1 week ago");
    await user.type(second.field, "Second");

    expect(first.field).toHaveValue("@amirrobson ");
    expect(second.field).toHaveValue("@ramsesmiron Second");
  });

  it("keeps a reply on the next visit", async () => {
    const user = setup();
    const { unmount } = render(<CommentThread />);
    const { field, send } = await openReply(user, "amirrobson 1 month ago");
    await user.type(field, "Still here");
    await user.click(send);

    unmount();
    render(<CommentThread />);

    expect(
      within(
        screen.getByRole("list", { name: "Replies to amirrobson" }),
      ).getByText("Still here"),
    ).toBeInTheDocument();
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
