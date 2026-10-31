import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";
import Signature from "./signature";

describe("Signature", () => {
  it("is the page footer landmark", () => {
    render(<Signature />);

    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      "Coded by Abdelrhman Abdelaal.",
    );
  });

  it("credits the author with a safe external link", () => {
    render(<Signature />);

    const link = screen.getByRole("link", { name: "Abdelrhman Abdelaal" });

    expect(link).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/abdelrhman-vanta/",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
