import { isAddress } from "viem";

export function isValidWalletAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("0x") || trimmed.length < 42) return false;
  return isAddress(trimmed);
}

export function parseMoneyAmount(value: string): number | null {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}
