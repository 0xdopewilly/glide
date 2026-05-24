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

export type StableSendToken = "USDC" | "EURC" | "cirBTC";

export type SendTransfer = {
  amount: string;
  token: StableSendToken;
};

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

/** Small-talk / acknowledgement / questions — NOT a request to move money.
 *  Anything matching this should bypass the "auto re-execute send from history" path. */
export function isSmallTalkOrQuestion(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  // Pure acknowledgements / thanks / agreement
  if (
    /^(thanks?( you| u)?( so much)?!*\.?$|^thx!*\.?$|^ty!*\.?$|^tysm!*\.?$|^cool!*\.?$|^nice!*\.?$|^great!*\.?$|^awesome!*\.?$|^perfect!*\.?$|^sweet!*\.?$|^ok(ay)?!*\.?$|^kk!*\.?$|^got it!*\.?$|^sounds good!*\.?$|^no problem!*\.?$|^np!*\.?$|^bet!*\.?$|^word!*\.?$|^👍+$|^❤️+$|^🙏+$)/.test(
      t,
    )
  ) {
    return true;
  }
  // Greetings
  if (/^(hi|hello|hey|yo|sup|hola|gm|good morning|good evening)[!.\s]*$/.test(t)) {
    return true;
  }
  // Information-seeking — these are questions, not actions
  if (
    /^(what|how|why|where|when|who|which|is|are|can|does|do|should|could|would|tell me|explain|describe)\b/.test(
      t,
    )
  ) {
    // ...unless the question is explicitly about doing a money action
    if (/\b(send|pay|swap|bridge|request|split|transfer|move)\b/.test(t)) {
      return false;
    }
    return true;
  }
  return false;
}

export function isNonSendMoneyMessage(text: string): boolean {
  return (
    isSwapOrBridgeMessage(text) ||
    /\b(split|request)\b/i.test(text) ||
    isSmallTalkOrQuestion(text)
  );
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
  const eurc = text.match(/(\d+(?:\.\d{1,2})?)\s*eurc/i);
  if (eurc) {
    const n = parseMoneyAmount(eurc[1]);
    if (n !== null && n > 0) return n.toFixed(2);
  }
  const gluedEurc = text.match(/(\d+(?:\.\d{1,2})?)eurc/i);
  if (gluedEurc) {
    const n = parseMoneyAmount(gluedEurc[1]);
    if (n !== null && n > 0) return n.toFixed(2);
  }
  const leading = text.match(
    /(?:swap|bridge|convert|send)\s+(\d+(?:\.\d{1,2})?)/i,
  );
  if (leading) {
    const n = parseMoneyAmount(leading[1]);
    if (n !== null && n > 0) return n.toFixed(2);
  }
  const split = text.match(/\bsplit\s+\$?\s*(\d+(?:\.\d{1,2})?)/i);
  if (split) {
    const n = parseMoneyAmount(split[1]);
    if (n !== null && n > 0) return n.toFixed(2);
  }
  return null;
}

/** e.g. "send 1 usdc and 1 eurc to @fifi" */
export function parseMultiSendFromMessage(text: string): {
  transfers: SendTransfer[];
  to: string;
} | null {
  const trimmed = text.trim();
  if (!/\bsend\b/i.test(trimmed) || isNonSendMoneyMessage(trimmed)) return null;

  const toMatch = trimmed.match(
    /\bto\s+(@?[a-z][a-z0-9_]{2,19}|0x[a-fA-F0-9]{40})\s*$/i,
  );
  if (!toMatch) return null;

  const body = trimmed
    .replace(/\bto\s+.+$/i, "")
    .replace(/^send\s+/i, "")
    .trim();
  if (!/\band\b|,/.test(body)) return null;

  const parts = body.split(/\s+and\s+|\s*,\s*/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  const transfers: SendTransfer[] = [];
  for (const part of parts) {
    const m = part.match(/(\d+(?:\.\d{1,8})?)\s*(usdc|eurc|cirbtc|cir-btc)\b/i);
    if (!m) return null;
    const n = parseMoneyAmount(m[1]);
    if (n === null || n <= 0) return null;
    const raw = m[2].toUpperCase();
    const token: StableSendToken =
      raw === "USDC" ? "USDC" : raw === "EURC" ? "EURC" : "cirBTC";
    transfers.push({ amount: n.toString(), token });
  }

  if (transfers.length < 2) return null;

  const to = toMatch[1].trim().replace(/^@/, "");
  if (isValidWalletAddress(to)) return { transfers, to };
  if (isValidUsername(normalizeUsername(to))) return { transfers, to };
  return null;
}

export function extractTokenFromText(text: string): StableSendToken | null {
  if (/\b(swap|convert)\b/i.test(text)) return null;
  if (/\bcirbtc\b|\bcir-btc\b/i.test(text) || /\d(?:\.\d+)?cirbtc/i.test(text)) {
    return "cirBTC";
  }
  if (/\beurc\b/i.test(text) || /\d(?:\.\d+)?eurc/i.test(text)) return "EURC";
  if (/\busdc\b/i.test(text) || /\d(?:\.\d+)?usdc/i.test(text)) return "USDC";
  return null;
}

/** e.g. "send 1 EURC to @fifi" or "send 1eurc to @fifi" */
export function parseSendFromMessage(text: string): {
  amount: string;
  token: StableSendToken;
  to: string;
} | null {
  const trimmed = text.trim();
  if (!/\bsend\b/i.test(trimmed) || isNonSendMoneyMessage(trimmed)) return null;
  if (parseMultiSendFromMessage(trimmed)) return null;

  const toMatch = trimmed.match(
    /\bto\s+(@?[a-z][a-z0-9_]{2,19}|0x[a-fA-F0-9]{40})\s*$/i,
  );
  if (!toMatch) return null;

  const body = trimmed
    .replace(/\bto\s+.+$/i, "")
    .replace(/^send\s+/i, "")
    .trim();

  const m =
    body.match(/(\d+(?:\.\d{1,8})?)\s*(usdc|eurc|cirbtc|cir-btc)\b/i) ??
    body.match(/(\d+(?:\.\d{1,8})?)(usdc|eurc|cirbtc|cir-btc)\b/i);
  if (!m) return null;

  const n = parseMoneyAmount(m[1]);
  if (n === null || n <= 0) return null;

  const rawSym = m[2].toUpperCase();
  const token: StableSendToken =
    rawSym === "USDC" ? "USDC" : rawSym === "EURC" ? "EURC" : "cirBTC";
  const to = toMatch[1].trim().replace(/^@/, "");
  const amountStr = token === "cirBTC" ? n.toString() : n.toFixed(2);

  if (isValidWalletAddress(to)) {
    return { amount: amountStr, token, to };
  }
  if (isValidUsername(normalizeUsername(to))) {
    return { amount: amountStr, token, to };
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

/** @handles from "split … with @a and @b" (excludes token-like @mentions). */
export function extractSplitRecipients(text: string): string[] {
  const trimmed = text.trim();
  const handles = new Set<string>();
  const atMentions = trimmed.matchAll(/@([a-z][a-z0-9_]{2,19})/gi);
  for (const m of atMentions) {
    const u = normalizeUsername(m[1]);
    if (isValidUsername(u) && !NOT_A_USERNAME.has(u)) handles.add(u);
  }

  if (handles.size === 0) {
    const between = trimmed.match(
      /\b(?:between|with)\s+([a-z0-9@,\s]+)/i,
    )?.[1];
    if (between) {
      for (const part of between.split(/[,]+|\s+and\s+/i)) {
        const name = part.trim().replace(/^@/, "");
        if (name.length >= 2 && isValidUsername(normalizeUsername(name))) {
          handles.add(normalizeUsername(name));
        }
      }
    }
  }

  return [...handles];
}

/** split $60 with @a @b — you paid; request each friend's share of the bill. */
export function parseSplitFromMessage(text: string): {
  total: string;
  recipients: string[];
  token: StableSendToken;
} | null {
  const trimmed = text.trim();
  if (!/\bsplit\b/i.test(trimmed)) return null;

  const total = extractAmountFromText(trimmed);
  if (!total) return null;

  const recipients = extractSplitRecipients(trimmed);
  if (recipients.length < 2) return null;

  return { total, recipients, token: extractTokenFromText(trimmed) ?? "USDC" };
}

/** request $10 USDC from @khadee — ask someone to pay you. */
export function parseRequestFromMessage(text: string): {
  amount: string;
  token: StableSendToken;
  glideTag: string;
} | null {
  const trimmed = text.trim();
  if (!/\brequest\b/i.test(trimmed)) return null;

  const amount = extractAmountFromText(trimmed);
  if (!amount) return null;

  const tagMatch =
    trimmed.match(/\bfrom\s+@?([a-z][a-z0-9_]{2,19})\b/i) ??
    trimmed.match(/\bto\s+@?([a-z][a-z0-9_]{2,19})\b/i) ??
    trimmed.match(/@([a-z][a-z0-9_]{2,19})\b/i);

  if (!tagMatch) return null;
  const glideTag = normalizeUsername(tagMatch[1]);
  if (!isValidUsername(glideTag) || NOT_A_USERNAME.has(glideTag)) return null;

  return {
    amount,
    token: extractTokenFromText(trimmed) ?? "USDC",
    glideTag,
  };
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
    const mentions = [...m.content.matchAll(/@([a-z][a-z0-9_]{2,19})/gi)];
    for (let j = mentions.length - 1; j >= 0; j--) {
      const u = normalizeUsername(mentions[j][1]);
      if (isValidUsername(u) && !NOT_A_USERNAME.has(u)) {
        return u;
      }
    }
    const hit = m.content.match(USERNAME_RE);
    if (hit?.[1]) {
      const u = normalizeUsername(hit[1]);
      if (isValidUsername(u) && !NOT_A_USERNAME.has(u)) {
        return u;
      }
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
