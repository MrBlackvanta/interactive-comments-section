import { STORAGE_KEY } from "@/lib";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import HomeError from "./error";

const SAVED = "[]";

function renderError() {
  const savedAtReset: (string | null)[] = [];
  const reset = () => savedAtReset.push(localStorage.getItem(STORAGE_KEY));
  render(<HomeError error={new Error("boom")} reset={reset} />);
  return savedAtReset;
}

describe("HomeError", () => {
  beforeEach(() => localStorage.setItem(STORAGE_KEY, SAVED));

  it("names the failure as the only heading of the main landmark", () => {
    renderError();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Something went wrong" }),
    );
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("retries in place rather than linking back to the page it is on", async () => {
    const savedAtReset = renderError();

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(savedAtReset).toEqual([SAVED]);
  });

  it("starts over by forgetting the saved thread before it retries", async () => {
    const savedAtReset = renderError();

    expect(screen.getByText(/start over to clear your changes/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(savedAtReset).toEqual([null]);
  });
});
