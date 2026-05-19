import type { GlideTransaction } from "@/lib/types";

function cacheKey(userId: string) {
  return `glide.transactions.${userId}`;
}

export function readCachedTransactions(
  userId?: string | null,
): GlideTransaction[] | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GlideTransaction[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeCachedTransactions(
  transactions: GlideTransaction[],
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  sessionStorage.setItem(cacheKey(userId), JSON.stringify(transactions));
}
