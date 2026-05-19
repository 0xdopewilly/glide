import { isValidWalletAddress, parseMoneyAmount } from "@/lib/validation";

export type AgentHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;

/** Last wallet address the user mentioned in the thread. */
export function extractWalletFromHistory(
  history: AgentHistoryMessage[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const hit = m.content.match(ADDRESS_RE);
    if (hit && isValidWalletAddress(hit[0])) return hit[0];
  }
  return null;
}

/** Latest dollar amount the user stated. */
export function extractAmountFromHistory(
  history: AgentHistoryMessage[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const text = m.content.trim();
    const dollar = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
    if (dollar) {
      const n = parseMoneyAmount(dollar[1]);
      if (n !== null && n > 0) return n.toFixed(2);
    }
    const usdc = text.match(/(\d+(?:\.\d{1,2})?)\s*usdc/i);
    if (usdc) {
      const n = parseMoneyAmount(usdc[1]);
      if (n !== null && n > 0) return n.toFixed(2);
    }
    const sendAmt = text.match(/send\s+(\d+(?:\.\d{1,2})?)/i);
    if (sendAmt) {
      const n = parseMoneyAmount(sendAmt[1]);
      if (n !== null && n > 0) return n.toFixed(2);
    }
    const plain = parseMoneyAmount(text.replace(/^\$/, ""));
    if (plain !== null && plain > 0 && text.length < 24) return plain.toFixed(2);
  }
  return null;
}

/** Friend / contact name from phrases like "named Khadee" or "to my friend Khadee". */
export function extractRecipientNameFromHistory(
  history: AgentHistoryMessage[],
): string | null {
  for (const m of history) {
    if (m.role !== "user") continue;
    const text = m.content;
    const patterns = [
      /(?:named?|called)\s+([A-Za-z][A-Za-z0-9' -]{0,28})/i,
      /(?:friend|contact)\s*,?\s*([A-Za-z][A-Za-z0-9' -]{0,28})/i,
      /send\s+\$?\d+(?:\.\d{1,2})?\s+to\s+([A-Za-z][A-Za-z0-9' -]{0,28})/i,
    ];
    for (const re of patterns) {
      const hit = text.match(re);
      if (hit?.[1]) {
        const name = hit[1].trim().replace(/[.,!?]+$/, "");
        if (name.length >= 2) return name;
      }
    }
  }
  return null;
}

export function canExecuteSendFromHistory(history: AgentHistoryMessage[]): {
  to: string;
  amount: string;
  recipientName?: string;
} | null {
  const to = extractWalletFromHistory(history);
  const amount = extractAmountFromHistory(history);
  if (!to || !amount) return null;
  const recipientName = extractRecipientNameFromHistory(history) ?? undefined;
  return { to, amount, recipientName };
}
