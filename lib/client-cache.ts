/** Per-user client caches live in localStorage (not sessionStorage), so a cold
 * start — the mobile app killed and relaunched — renders last-known balances,
 * activity and profile instantly instead of skeletons. Everything under these
 * prefixes is wiped on sign-out so nothing lingers on a shared device.
 * Best-effort: never throws (private mode, quota, disabled storage). */

const USER_CACHE_PREFIXES = [
  "glide.balances.",
  "glide.transactions.",
  "glide.wallet.",
  "glide.profile.",
  "glide.ui.",
  "glide.chat.",
];

/** Last signed-in user, so the app shell can render from cache and start
 * fetching before Clerk's script has loaded. */
export const LAST_USER_KEY = "glide.lastUser";

export function cacheGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded or storage disabled — caches are optional */
  }
}

export function cacheRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function clearMatching(storage: Storage) {
  const doomed: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && (k === LAST_USER_KEY || USER_CACHE_PREFIXES.some((p) => k.startsWith(p)))) {
      doomed.push(k);
    }
  }
  for (const k of doomed) storage.removeItem(k);
}

/** Wipe every user cache on this device (sign-out, or session gone). */
export function clearUserCaches(): void {
  if (typeof window === "undefined") return;
  try {
    clearMatching(localStorage);
    clearMatching(sessionStorage); // older builds kept caches here
  } catch {
    /* ignore */
  }
}
