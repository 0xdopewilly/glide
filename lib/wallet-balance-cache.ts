import type { GlideTokenBalance } from "@/lib/types";

export type CachedWalletBalances = {
  balance: number;
  tokens: GlideTokenBalance[];
  totalUsd: number;
  updatedAt: number;
};

const MAX_AGE_MS = 1000 * 60 * 30;

function cacheKey(userId: string) {
  return `glide.balances.${userId}`;
}

export function readCachedWalletBalances(
  userId?: string | null,
): CachedWalletBalances | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWalletBalances;
    if (
      typeof parsed.balance !== "number" ||
      !Array.isArray(parsed.tokens) ||
      typeof parsed.totalUsd !== "number"
    ) {
      return null;
    }
    if (Date.now() - (parsed.updatedAt ?? 0) > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedWalletBalances(
  payload: Omit<CachedWalletBalances, "updatedAt">,
  userId?: string | null,
): void {
  if (typeof window === "undefined" || !userId) return;
  sessionStorage.setItem(
    cacheKey(userId),
    JSON.stringify({ ...payload, updatedAt: Date.now() }),
  );
}

export function clearCachedWalletBalances(userId?: string | null): void {
  if (typeof window === "undefined" || !userId) return;
  sessionStorage.removeItem(cacheKey(userId));
}
