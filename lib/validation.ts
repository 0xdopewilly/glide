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
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  const u = normalizeUsername(raw);
  if (!USERNAME_RE.test(u)) return false;
  return !RESERVED_USERNAMES.has(u);
}

export function parseMoneyAmount(value: string): number | null {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}
