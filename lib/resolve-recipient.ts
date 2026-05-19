import { findContactByName } from "@/lib/contacts-db";
import { shortenAddress } from "@/lib/format";
import { formatUsernameForPush } from "@/lib/push-display";
import { findUserByUsername, findUserByWalletAddress } from "@/lib/usernames";
import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
} from "@/lib/validation";

export type ResolvedRecipient = {
  address: string;
  label: string;
  source: "wallet" | "username" | "contact";
};

/**
 * Resolve a send target: 0x address, Glide @username, or saved contact name.
 */
export async function resolveRecipient(
  senderUserId: string,
  raw: string,
): Promise<ResolvedRecipient | null> {
  const input = raw.trim();
  if (!input) return null;

  if (isValidWalletAddress(input)) {
    return {
      address: input,
      label: input,
      source: "wallet",
    };
  }

  const maybeUsername = normalizeUsername(input);
  if (isValidUsername(maybeUsername)) {
    const glideUser = await findUserByUsername(maybeUsername);
    if (glideUser?.circleWalletAddress) {
      return {
        address: glideUser.circleWalletAddress,
        label: glideUser.username,
        source: "username",
      };
    }
  }

  const contact = await findContactByName(senderUserId, input);
  if (contact) {
    return {
      address: contact.walletAddress,
      label: contact.name,
      source: "contact",
    };
  }

  return null;
}

/** Display name for pushes, receipts, and activity titles. */
export function formatResolvedRecipientLabel(resolved: ResolvedRecipient): string {
  if (resolved.source === "username") {
    return formatUsernameForPush(resolved.label);
  }
  if (resolved.source === "contact") {
    return resolved.label;
  }
  return resolved.label;
}
