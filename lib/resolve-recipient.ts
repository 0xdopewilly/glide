import { findContactByExactName } from "@/lib/contacts-db";
import { formatUsernameForPush } from "@/lib/push-display";
import { findUserByUsername } from "@/lib/usernames";
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
 *
 * Precedence protects against pay-tag squatting: "@mom" always means the
 * pay tag; a bare "mom" means the sender's own saved contact when one
 * matches exactly, else the pay tag. Contact names never match partially.
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

  const explicitTag = input.startsWith("@");
  if (!explicitTag) {
    const contact = await findContactByExactName(senderUserId, input);
    if (contact) {
      return {
        address: contact.walletAddress,
        label: contact.name,
        source: "contact",
      };
    }
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

  return null;
}

/** Label for confirm screens: pay tags always show as @tag (display names
 * are self-chosen and could imitate anyone); contacts show the sender's own
 * name for them. */
export function recipientConfirmLabel(resolved: ResolvedRecipient): string {
  return resolved.source === "username" ? `@${resolved.label}` : resolved.label;
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
