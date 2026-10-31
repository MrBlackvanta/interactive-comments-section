import { describe, expect, it, vi } from "vite-plus/test";
import { mediaListenerCount, setMediaMatch } from "./media";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

describe("matchMedia stub", () => {
  it("reports the current match and notifies subscribers when it flips", () => {
    const query = window.matchMedia(REDUCED_MOTION);
    const listener = vi.fn();
    query.addEventListener("change", listener);

    expect(query.matches).toBe(false);
    setMediaMatch(REDUCED_MOTION, true);

    expect(query.matches).toBe(true);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ matches: true, media: REDUCED_MOTION }),
    );
  });

  it("stops notifying a listener once it is removed", () => {
    const query = window.matchMedia(REDUCED_MOTION);
    const listener = vi.fn();
    query.addEventListener("change", listener);
    query.removeEventListener("change", listener);

    setMediaMatch(REDUCED_MOTION, true);

    expect(listener).not.toHaveBeenCalled();
    expect(mediaListenerCount(REDUCED_MOTION)).toBe(0);
  });
});
