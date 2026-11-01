import { afterEach, describe, expect, it, vi } from "vite-plus/test";

const mount = () => {
  document.body.innerHTML = `
    <button id="opener">Open</button>
    <dialog><p>Sure?</p><button>No</button><button>Yes</button></dialog>`;
  const opener = document.querySelector<HTMLButtonElement>("#opener")!;
  const dialog = document.querySelector("dialog")!;
  opener.focus();
  return { opener, dialog };
};

describe("dialog stub", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens on its first control and hands focus back to the opener once closed", () => {
    const { opener, dialog } = mount();
    const closed = vi.fn();
    dialog.addEventListener("close", closed);

    dialog.showModal();
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toHaveTextContent("No");

    dialog.close();
    dialog.close();
    expect(dialog.open).toBe(false);
    expect(opener).toHaveFocus();
    expect(closed).toHaveBeenCalledOnce();
  });

  it("cancels the open dialog on Escape", () => {
    const { dialog } = mount();
    const cancelled = vi.fn();
    dialog.addEventListener("cancel", cancelled);
    dialog.showModal();

    document.activeElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );

    expect(cancelled).toHaveBeenCalledOnce();
    expect(dialog.open).toBe(false);
  });

  it("leaves focus alone when the opener is gone", () => {
    const { opener, dialog } = mount();
    const restore = vi.spyOn(opener, "focus");
    dialog.showModal();
    opener.remove();

    dialog.close();

    expect(restore).not.toHaveBeenCalled();
  });
});
