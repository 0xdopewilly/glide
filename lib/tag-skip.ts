import { cacheGet, cacheSet } from "@/lib/client-cache";

/** "Skip for now" on pay-tag setup, remembered per user on this device (the
 * glide.ui. prefix is wiped on sign-out). The tag can be claimed later from
 * Profile. */
const key = (userId: string) => `glide.ui.tagSkipped.${userId}`;

export function hasSkippedTag(userId?: string | null): boolean {
  return Boolean(userId && cacheGet(key(userId)) === "1");
}

export function skipTag(userId: string): void {
  cacheSet(key(userId), "1");
}
