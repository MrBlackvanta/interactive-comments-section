export function reveal(element: Element | null | undefined) {
  const motionSafe = matchMedia(
    "(prefers-reduced-motion: no-preference)",
  ).matches;
  element?.scrollIntoView({
    block: "nearest",
    behavior: motionSafe ? "smooth" : "instant",
  });
}
