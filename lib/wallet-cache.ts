import type { GlideWallet } from "@/lib/types";

const CACHE_KEY = "glide.wallet.v1";

export function readCachedWallet(): GlideWallet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GlideWallet;
    if (parsed?.id && parsed?.address) return parsed;
  } catch {
    /* ignore corrupt cache */
  }
  return null;
}

export function writeCachedWallet(wallet: GlideWallet | null): void {
  if (typeof window === "undefined") return;
  if (!wallet) {
    sessionStorage.removeItem(CACHE_KEY);
    return;
  }
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(wallet));
}
