/** Screen-transition direction for native push/pop, set on <html data-nav>
 * and read by the ::view-transition CSS in app/globals.css.
 * - "tab":  switching between tabs — instant, no motion
 * - "push": opening a screen — slides in from the right
 * - "pop":  going back (or up to a tab) — slides out to the right */
export type NavDirection = "push" | "pop" | "tab";

export const TAB_ROOTS: ReadonlySet<string> = new Set([
  "/",
  "/payments",
  "/automations",
  "/profile",
]);

export function navDirection(
  prev: string,
  next: string,
  popped: boolean,
): NavDirection | null {
  if (prev === next) return null;
  const prevTab = TAB_ROOTS.has(prev);
  const nextTab = TAB_ROOTS.has(next);
  if (prevTab && nextTab) return "tab";
  if (popped) return "pop";
  if (nextTab) return "pop";
  if (prev.startsWith(`${next}/`)) return "pop";
  return "push";
}
