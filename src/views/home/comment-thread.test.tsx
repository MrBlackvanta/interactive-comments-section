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

const OWN_REPLY = "juliusomo you 2 days ago";

const OWN_TEXT =
  "I couldn't agree more with this. Everything moves so fast and it always seems like everyone knows the newest library/framework. But the fundamentals are what stay constant.";

const editButton = (name = OWN_REPLY) =>
  within(screen.getByRole("article", { name })).getByRole("button", {
    name: "Edit",
  });

const openEdit = async (
  user: User,
  name = OWN_REPLY,
  label = "Edit your reply to @ramsesmiron",
) => {
  await user.click(editButton(name));
  const field = screen.getByRole<HTMLTextAreaElement>("textbox", {
    name: label,
  });
  return {
    field,
    update: within(field.form!).getByRole("button", { name: "Update" }),
  };
};

const shown = (name = OWN_REPLY) =>
  within(screen.getByRole("article", { name })).queryByText("@ramsesmiron")
    ?.parentElement;

const deleteButton = (
  card = screen.getByRole("article", { name: OWN_REPLY }),
) => within(card).getByRole("button", { name: "Delete" });

const openDelete = async (user: User, card?: HTMLElement) => {
  await user.click(deleteButton(card));
  const dialog = screen.getByRole("alertdialog", { name: "Delete comment" });
  return {
    dialog,
    cancel: within(dialog).getByRole("button", { name: "No, cancel" }),
    confirm: within(dialog).getByRole("button", { name: "Yes, delete" }),
  };
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

  it.each([
    [
      "a comment",
      async (user: User) => {
        await user.type(composer().field, "Stay");
        await user.click(composer().send);
      },
    ],
    [
      "an edit",
      async (user: User) => {
        const { update } = await openEdit(user);
        await user.click(update);
      },
    ],
  ])(
    "sends %s without the browser submitting the page away",
    async (_, act) => {
      let submit: Event | undefined;
      document.addEventListener("submit", (event) => (submit = event), {
        once: true,
      });
      const user = setup();
      render(<CommentThread />);

      await act(user);

      expect(submit?.defaultPrevented).toBe(true);
    },
  );

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
    expect(field).toBeRequired();
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

  it("offers a collapsed Edit on your items and none on anyone else's", () => {
    render(<CommentThread />);

    for (const card of screen.getAllByRole("article")) {
      const own = within(card).queryByText("you") !== null;
      const edit = within(card).queryByRole("button", { name: "Edit" });

      if (own) expect(edit).toHaveAttribute("aria-expanded", "false");
      else expect(edit).not.toBeInTheDocument();
    }
  });

  it("opens your reply for editing in place, mention included and the caret at the end", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field } = await openEdit(user);

    expect(editButton()).toHaveAttribute("aria-expanded", "true");
    expect(field).toHaveValue(`@ramsesmiron ${OWN_TEXT}`);
    expect(field).toHaveFocus();
    expect(field).toBeRequired();
    expect(field.selectionStart).toBe(field.value.length);
    expect(shown()).toBeUndefined();
  });

  it("saves the edit in place, keeps the mention out of the text, and returns focus to Edit", async () => {
    const user = setup();
    render(<CommentThread />);

    const { field, update } = await openEdit(user);
    await user.clear(field);
    await user.type(field, "@ramsesmiron  Fair point. ");
    await user.click(update);

    const replies = within(
      screen.getByRole("list", { name: "Replies to maxblagun" }),
    ).getAllByRole("article");
    expect(field).not.toBeInTheDocument();
    expect(replies[1]).toHaveAccessibleName(OWN_REPLY);
    expect(shown()).toHaveTextContent(/^@ramsesmiron Fair point\.$/);
    expect(editButton()).toHaveFocus();
    expect(editButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("status")).toHaveTextContent(/^Comment updated$/);
  });

  it("edits a comment of yours that answers no one", async () => {
    const user = setup();
    render(<CommentThread />);
    await user.type(composer().field, "First draft");
    await user.click(composer().send);

    const { field, update } = await openEdit(
      user,
      "juliusomo you just now",
      "Edit your comment",
    );
    expect(field).toHaveValue("First draft");
    await user.type(field, ", revised");
    await user.click(update);

    expect(
      within(latest()).getByText("First draft, revised"),
    ).toBeInTheDocument();
  });

  it.each([
    ["only the mention", "{Control>}a{/Control}@ramsesmiron "],
    ["nothing at all", "{Control>}a{/Control}{Backspace}"],
  ])("refuses to save an edit of %s", async (_, keys) => {
    const user = setup();
    render(<CommentThread />);

    const { field, update } = await openEdit(user);
    await user.type(field, keys);
    await user.click(update);

    expect(field).toBeInvalid();
    expect(field).toBeInTheDocument();
  });

  it.each([
    ["on Escape", (user: User) => user.keyboard("{Escape}")],
    ["when Edit is pressed again", (user: User) => user.click(editButton())],
  ])(
    "discards the edit %s, keeps the text and leaves focus on Edit",
    async (_, cancel) => {
      const user = setup();
      render(<CommentThread />);

      const { field } = await openEdit(user);
      await user.type(field, " Never mind");
      await cancel(user);

      expect(field).not.toBeInTheDocument();
      expect(shown()).toHaveTextContent(`@ramsesmiron ${OWN_TEXT}`);
      expect(editButton()).toHaveFocus();

      const reopened = await openEdit(user);
      expect(reopened.field).toHaveValue(`@ramsesmiron ${OWN_TEXT}`);
    },
  );

  it.each([
    ["Update", (user: User, update: HTMLElement) => user.click(update)],
    ["Escape", (user: User) => user.keyboard("{Escape}")],
  ])(
    "removes the form before focusing Edit on %s, so the browser never scrolls to where Edit was",
    async (_, close) => {
      const user = setup();
      render(<CommentThread />);
      const { field, update } = await openEdit(user);
      let formOpen: boolean | undefined;
      vi.spyOn(editButton(), "focus").mockImplementation(() => {
        formOpen = field.isConnected;
      });

      await close(user, update);

      expect(formOpen).toBe(false);
    },
  );

  it("keeps an edit on the next visit", async () => {
    const user = setup();
    const { unmount } = render(<CommentThread />);
    const { field, update } = await openEdit(user);
    await user.type(field, " Still here");
    await user.click(update);

    unmount();
    render(<CommentThread />);

    expect(shown()).toHaveTextContent(/constant\. Still here$/);
  });

  it("offers Delete on your items and none on anyone else's, with no dialog open", () => {
    render(<CommentThread />);

    for (const card of screen.getAllByRole("article")) {
      const own = within(card).queryByText("you") !== null;
      const remove = within(card).queryByRole("button", { name: "Delete" });

      if (own) expect(remove).toHaveAttribute("aria-haspopup", "dialog");
      else expect(remove).not.toBeInTheDocument();
    }
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("asks before deleting, warns it can't be undone, and focuses the safe choice", async () => {
    const user = setup();
    render(<CommentThread />);

    const { dialog, cancel } = await openDelete(user);

    expect(dialog).toHaveAccessibleDescription(/can’t be undone\.$/);
    expect(cancel).toHaveFocus();
    expect(shown()).toHaveTextContent(`@ramsesmiron ${OWN_TEXT}`);
  });

  it.each([
    ["on No, cancel", (user: User, cancel: HTMLElement) => user.click(cancel)],
    ["on Escape", (user: User) => user.keyboard("{Escape}")],
  ])("keeps the reply %s and returns focus to Delete", async (_, close) => {
    const user = setup();
    render(<CommentThread />);

    const { dialog, cancel } = await openDelete(user);
    await close(user, cancel);

    expect(dialog).not.toBeVisible();
    expect(shown()).toHaveTextContent(`@ramsesmiron ${OWN_TEXT}`);
    expect(deleteButton()).toHaveFocus();
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("deletes your reply, then focuses the card before it, since none follows", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    const user = setup();
    render(<CommentThread />);

    const { dialog, confirm } = await openDelete(user);
    await user.click(confirm);

    const replies = within(
      screen.getByRole("list", { name: "Replies to maxblagun" }),
    ).getAllByRole("article");
    expect(dialog).not.toBeVisible();
    expect(replies).toHaveLength(1);
    expect(replies[0]).toHaveAccessibleName("ramsesmiron 1 week ago");
    expect(replies[0]).toHaveFocus();
    expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    expect(scroll.mock.contexts.at(-1)).toBe(replies[0]);
    expect(screen.getByRole("status")).toHaveTextContent(/^Comment deleted$/);
  });

  it("focuses the card that follows a deleted comment", async () => {
    const user = setup();
    render(<CommentThread />);
    for (const text of ["First", "Second"]) {
      await user.type(composer().field, text);
      await user.click(composer().send);
    }

    const [first, second] = screen.getAllByRole("article").slice(-2);
    const { confirm } = await openDelete(user, first);
    await user.click(confirm);

    expect(first).not.toBeInTheDocument();
    expect(second).toHaveTextContent("Second");
    expect(second).toHaveFocus();
  });

  it("deletes a comment of yours with its replies, then focuses the comment after them", async () => {
    save([
      comment({
        id: 1,
        username: "juliusomo",
        score: 9,
        replies: [
          {
            id: 2,
            username: "maxblagun",
            content: "A reply",
            score: 0,
            createdAt: NOW,
            vote: 0,
            replyingTo: "juliusomo",
          },
        ],
      }),
      comment({ id: 3, content: "Still here" }),
    ]);
    const user = setup();
    render(<CommentThread />);
    const [own, , after] = screen.getAllByRole("article");

    const { confirm } = await openDelete(user, own);
    await user.click(confirm);

    const remaining = screen.getAllByRole("article");
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toBe(after);
    expect(after).toHaveFocus();
  });

  it.each([
    ["after Escape", (user: User) => user.keyboard("{Escape}")],
    [
      "after a first Yes",
      (user: User, confirm: HTMLElement) => user.click(confirm),
    ],
  ])(
    "ignores Yes, delete on a panel that is still fading out %s",
    async (_, close) => {
      const user = setup();
      render(<CommentThread />);
      const status = screen.getByRole("status");
      const { confirm } = await openDelete(user);
      await close(user, confirm);
      const announced = status.firstElementChild;
      const count = screen.getAllByRole("article").length;

      fireEvent.click(confirm);

      expect(status.firstElementChild).toBe(announced);
      expect(screen.getAllByRole("article")).toHaveLength(count);
    },
  );

  it("never hands focus back to the Delete it removed, so the browser never scrolls to where it was", async () => {
    const user = setup();
    render(<CommentThread />);
    const { confirm } = await openDelete(user);
    const restore = vi.spyOn(deleteButton(), "focus");

    await user.click(confirm);

    expect(restore).not.toHaveBeenCalled();
  });

  it("keeps a deletion on the next visit", async () => {
    const user = setup();
    const { unmount } = render(<CommentThread />);
    const { confirm } = await openDelete(user);
    await user.click(confirm);

    unmount();
    render(<CommentThread />);

    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.queryByRole("article", { name: OWN_REPLY }),
    ).not.toBeInTheDocument();
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
