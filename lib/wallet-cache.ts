import { cacheGet, cacheSet, cacheRemove } from "@/lib/client-cache";
import type { GlideWallet } from "@/lib/types";

function cacheKey(userId: string) {
  return `glide.wallet.${userId}`;
}

export function readCachedWallet(userId?: string | null): GlideWallet | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = cacheGet(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GlideWallet;
    if (parsed?.id && parsed?.address) return parsed;
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

export function writeCachedWallet(
  wallet: GlideWallet | null,
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  const key = cacheKey(userId);
  if (!wallet) {
    cacheRemove(key);
    return;
  }
  cacheSet(key, JSON.stringify(wallet));
}
