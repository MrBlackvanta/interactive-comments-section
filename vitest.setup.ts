import { installDialog } from "@/test/dialog";
import { installMatchMedia } from "@/test/media";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vite-plus/test";

installDialog();

beforeEach(() => {
  installMatchMedia();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);
