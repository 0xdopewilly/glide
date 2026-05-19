import { shortenAddress } from "@/lib/format";
import { findUserByWalletAddress } from "@/lib/usernames";

/** Strip leading @ for notification copy (khadee, not @khadee). */
export function formatUsernameForPush(raw: string): string {
  return raw.trim().replace(/^@+/, "");
}

/** Human label for push copy: username or 0xabc…def */
export async function formatUserForPush(
  walletAddress?: string | null,
): Promise<string> {
  if (!walletAddress?.trim()) return "someone";

  const user = await findUserByWalletAddress(walletAddress);
  if (user?.username) return formatUsernameForPush(user.username);

  return shortenAddress(walletAddress.trim(), 6);
}

/** "+$1.00" → "$1.00" */
export function formatAmountForPush(amountLabel: string): string {
  const cleaned = amountLabel.trim().replace(/^[+\-−]/, "");
  return cleaned.startsWith("$") ? cleaned : `$${cleaned}`;
}
