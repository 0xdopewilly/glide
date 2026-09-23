import { cacheGet, cacheSet } from "@/lib/client-cache";
import type { GlideProfile } from "@/lib/types";

function cacheKey(userId: string) {
  return `glide.profile.${userId}`;
}

export function readCachedProfile(userId?: string | null): GlideProfile | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = cacheGet(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GlideProfile;
    if (parsed?.email) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCachedProfile(
  profile: GlideProfile,
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  cacheSet(cacheKey(userId), JSON.stringify(profile));
}
