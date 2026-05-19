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
): string {
  const each = computeSplitSharePerPerson(parseFloat(total), friendCount);
  const people = splitParticipantCount(friendCount);
  return `Requesting $${each} from ${friendCount} friend${friendCount === 1 ? "" : "s"} ($${total} ÷ ${people})…`;
}

export function formatSplitSuccessMessage(
  total: string,
  share: string,
  recipients: string[],
): string {
  const tags = recipients.map((r) => `@${r}`).join(", ");
  const people = splitParticipantCount(recipients.length);
  return `Split $${total} (${people} people) — requested $${share} each from ${tags}. They’ll get a pay link in Glide.`;
}

export function formatSplitPartialMessage(
  requested: number,
  totalFriends: number,
  share: string,
): string {
  return `Requested $${share} from ${requested} of ${totalFriends} friends. Finish the rest on Request.`;
}
