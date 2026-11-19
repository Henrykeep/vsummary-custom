import { useEffect, useState } from "react";

// Tablets in portrait (and narrow split-screen windows) cannot fit the 320px
// library sidebar plus a useful two-pane studio. Use the one-pane shell until
// Tailwind's `lg` breakpoint.
const NARROW_QUERY = "(max-width: 1023px)";

// jsdom (tests) has no matchMedia; treat that as a wide screen.
export function matchesNarrowViewport() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(NARROW_QUERY).matches;
}

/** True below Tailwind's `lg` breakpoint, where the workspace shows one pane at a time. */
export function useNarrowViewport() {
  const [narrow, setNarrow] = useState(matchesNarrowViewport);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia(NARROW_QUERY);
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}
