import {
  currencyPrefixForToken,
  formatStableAmountWithCode,
  type StableToken,
} from "@/lib/currency-format";

/** Bill split: you paid; each friend owes an equal share (you included in the count). */

export function splitParticipantCount(friendCount: number): number {
  return friendCount + 1;
}

export function computeSplitSharePerPerson(
  totalBill: number,
  friendCount: number,
): string {
  const people = splitParticipantCount(friendCount);
  if (people <= 0 || totalBill <= 0) return "0.00";
  return (totalBill / people).toFixed(2);
}

export function formatSplitProcessingReply(
  total: string,
  friendCount: number,
  token: StableToken = "USDC",
): string {
  const each = computeSplitSharePerPerson(parseFloat(total), friendCount);
  const people = splitParticipantCount(friendCount);
  const prefix = currencyPrefixForToken(token);
  return `Requesting ${prefix}${each} from ${friendCount} friend${friendCount === 1 ? "" : "s"} (${prefix}${total} ÷ ${people})…`;
}

export function formatSplitSuccessMessage(
  total: string,
  share: string,
  recipients: string[],
  token: StableToken = "USDC",
): string {
  const tags = recipients.map((r) => `@${r}`).join(", ");
  const people = splitParticipantCount(recipients.length);
  return `Split ${formatStableAmountWithCode(total, token)} (${people} people) - requested ${formatStableAmountWithCode(share, token)} each from ${tags}. They’ll get a pay link in Glide.`;
}

export function formatSplitPartialMessage(
  requested: number,
  totalFriends: number,
  share: string,
  token: StableToken = "USDC",
): string {
  return `Requested ${formatStableAmountWithCode(share, token)} from ${requested} of ${totalFriends} friends. Finish the rest in chat or Request.`;
}
