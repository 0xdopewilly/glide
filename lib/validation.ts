import { isAddress } from "viem";

export function isValidWalletAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("0x") || trimmed.length < 42) return false;
  return isAddress(trimmed);
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "glide",
  "support",
  "help",
  "api",
  "www",
  "null",
  "undefined",
  "system",
  "root",
  // Product words people type as destinations ("send $50 to savings").
  "savings",
  "spending",
  "wallet",
  "glidepay",
  "billy",
  "arc",
  "circle",
  "usdc",
  "eurc",
  "cirbtc",
  "official",
  "security",
  "team",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) return false;
  return !RESERVED_USERNAMES.has(u);
}

const AMOUNT_RE = /^(\d+(\.\d*)?|\.\d+)$/;

/** Strict amount parse for money paths: plain decimals only ("10", "0.5",
 * "1,000.25"). parseFloat would accept "10abc", "1e3" or read "1,000" as 1.
 * With `maxDecimals`, more precision than the token has is rejected rather
 * than silently rounded up at send time. */
export function parseMoneyAmount(
  value: string,
  options?: { maxDecimals?: number },
): number | null {
  const cleaned = String(value ?? "").trim().replace(/,/g, "");
  if (!AMOUNT_RE.test(cleaned)) return null;
  const decimals = cleaned.split(".")[1]?.length ?? 0;
  if (options?.maxDecimals !== undefined && decimals > options.maxDecimals) {
    return null;
  }
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  // Don't round here — cirBTC needs up to 8 decimals; callers format per token.
  return parsed;
}
