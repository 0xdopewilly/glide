/**
 * Tiny user-scoped sessionStorage cache for small UI summaries (savings totals,
 * automation stats, etc.). Lets a screen seed from last-known values on mount
 * and render instantly instead of popping in after a fetch — killing the
 * layout shift on repeat visits. Best-effort: never throws, returns null on any
 * problem. Scoped per user so nothing leaks across accounts on a shared device.
 */

function key(name: string, userId: string) {
  return `glide.ui.${name}.${userId}`;
}

export function readUiCache<T>(
  name: string,
  userId: string | null | undefined,
  maxAgeMs: number,
): T | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(key(name, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: T; t: number };
    if (typeof parsed.t !== "number") return null;
    if (Date.now() - parsed.t > maxAgeMs) return null;
    return parsed.v;
  } catch {
    return null;
  }
}

export function writeUiCache<T>(
  name: string,
  userId: string | null | undefined,
  value: T,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    sessionStorage.setItem(
      key(name, userId),
      JSON.stringify({ v: value, t: Date.now() }),
    );
  } catch {
    /* quota exceeded or storage disabled — cache is optional */
  }
}
