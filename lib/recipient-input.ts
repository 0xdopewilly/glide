import { isValidUsername, isValidWalletAddress } from "@/lib/validation";

/** Client-side: recipient field has something we can try to resolve server-side. */
export function looksLikeRecipient(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (isValidWalletAddress(t)) return true;
  if (isValidUsername(t.replace(/^@/, ""))) return true;
  return t.length >= 2;
}
