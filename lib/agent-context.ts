import {
  isValidUsername,
  isValidWalletAddress,
  normalizeUsername,
  parseMoneyAmount,
} from "@/lib/validation";

export type AgentHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BridgeNetwork = "ethereum" | "base" | "polygon" | "arbitrum";

const ADDRESS_RE = /0x[a-fA-F0-9]{40}/;
const USERNAME_RE = /@?([a-z][a-z0-9_]{2,19})\b/i;

/** Tokens / verbs that look like @handles but are not people. */
const NOT_A_USERNAME = new Set([
  "usdc",
  "eurc",
  "usdt",
  "btc",
  "eth",
  "swap",
  "bridge",
  "send",
  "convert",
  "arc",
  "base",
  "polygon",
  "arbitrum",
  "ethereum",
]);

export function isSwapOrBridgeMessage(text: string): boolean {
  return /\b(swap|convert|bridge)\b/i.test(text);
}

export function extractAmountFromText(text: string): string | null {
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
  const leading = text.match(
    /(?:swap|bridge|convert|send)\s+(\d+(?:\.\d{1,2})?)/i,
  );
  if (leading) {
    const n = parseMoneyAmount(leading[1]);
    if (n !== null && n > 0) return n.toFixed(2);
  }
  return null;
}

export function extractBridgeNetworkFromText(text: string): BridgeNetwork {
  const lower = text.toLowerCase();
  if (/\bbase\b/.test(lower)) return "base";
  if (/\bpolygon\b/.test(lower)) return "polygon";
  if (/\barbitrum\b/.test(lower)) return "arbitrum";
  return "ethereum";
}

/** Deterministic swap/bridge from the latest user line (beats stale send context). */
export function parseExplicitIntentFromMessage(
  text: string,
): { action: "swap"; amount: string } | { action: "bridge"; amount: string; network: BridgeNetwork } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const amount = extractAmountFromText(trimmed);
  if (!amount) return null;

  if (/\bbridge\b/i.test(trimmed)) {
    return {
      action: "bridge",
      amount,
      network: extractBridgeNetworkFromText(trimmed),
    };
  }

  if (/\b(swap|convert)\b/i.test(trimmed)) {
    return { action: "swap", amount };
  }

  return null;
}

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
    const hit = extractAmountFromText(m.content.trim());
    if (hit) return hit;
  }
  return null;
}

/** @username from chat (e.g. "send $5 to @khadee"). */
export function extractUsernameFromHistory(
  history: AgentHistoryMessage[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    const hit = m.content.match(USERNAME_RE);
    if (hit?.[1] && isValidUsername(hit[1])) {
      return normalizeUsername(hit[1]);
    }
  }
  return null;
}

/** Friend / contact name from phrases like "named Khadee" or "to my friend Khadee". */
export function extractRecipientNameFromHistory(
  history: AgentHistoryMessage[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    if (isSwapOrBridgeMessage(m.content)) continue;
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
