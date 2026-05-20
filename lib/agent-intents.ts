import type {
  AgentHistoryMessage,
  BridgeNetwork,
  SendTransfer,
  StableSendToken,
} from "@/lib/agent-context";
import {
  canExecuteSendFromHistory,
  extractAmountFromHistory,
  extractRecipientNameFromHistory,
  extractTokenFromText,
  extractUsernameFromHistory,
  extractWalletFromHistory,
  isNonSendMoneyMessage,
  isSwapOrBridgeMessage,
  parseExplicitIntentFromMessage,
  parseMultiSendFromMessage,
  parseSendFromMessage,
  extractSplitRecipients,
  parseRequestFromMessage,
  parseSplitFromMessage,
} from "@/lib/agent-context";
import { findContactByName } from "@/lib/contacts-db";
import { findUserByUsername } from "@/lib/usernames";
import { normalizeUsername } from "@/lib/validation";

export type GlideIntent =
  | { action: "reply"; message: string }
  | {
      action: "send";
      amount: string;
      to: string;
      token?: StableSendToken;
      recipientName?: string;
    }
  | {
      action: "send_batch";
      transfers: SendTransfer[];
      to: string;
      recipientName?: string;
    }
  | { action: "swap"; amount: string }
  | { action: "bridge"; amount: string; network: BridgeNetwork }
  | {
      action: "request";
      amount: string;
      token: StableSendToken;
      glideTag: string;
      note?: string;
    }
  | { action: "split"; total: string; recipients: string[]; token?: StableSendToken }
  | { action: "navigate"; path: string };

export type { BridgeNetwork } from "@/lib/agent-context";

export const AGENT_SYSTEM_PROMPT = `You are Glide, a friendly mobile wallet assistant on Arc testnet (USDC).
Users speak in plain language. Never mention gas, seed phrases, MetaMask, or Web3 jargon.

You receive the FULL conversation history. Read every prior message before responding.

RULES (critical):
1. NEVER ask for a wallet address if the user already sent a 0x address in this conversation.
2. NEVER ask for an amount if the user already said how much (e.g. "$1", "$1.00", "1 dollar").
3. When you have BOTH a valid 0x address AND an amount from the conversation, you MUST respond with send JSON immediately — do not ask "what would you like to do".
4. Ask at most ONE clarifying question when something is truly missing.
5. Amounts are USD strings like "1.00". Addresses must be 0x + 40 hex chars.
6. For Glide users, "to" can be @username (e.g. "khadee") or a saved contact name — not only 0x addresses.
7. "swap 1 USDC to EURC" is ALWAYS {"action":"swap","amount":"1.00"} — EURC is a token, NOT a person. Never send when user said swap or bridge.
8. "bridge $5 to Base" is ALWAYS bridge JSON with network "base" — never send.
9. Multiple tokens to one person: {"action":"send_batch","transfers":[{"amount":"1.00","token":"USDC"},{"amount":"1.00","token":"EURC"}],"to":"fifi"} — never only send the first token.
10. Single-token send: include "token":"USDC" or "token":"EURC" when the user names the token.
11. "split" means the user ALREADY PAID a bill and wants to REQUEST each friend's equal share — NEVER send money on split. Include the user in the math: share = total ÷ (friends + 1). Only use a total the user stated in this chat — NEVER invent amounts (no default $60).
12. Split needs total bill + at least two @usernames. If either is missing, use reply JSON to ask once.
13. "request" means ask someone to pay YOU — use request JSON with amount, token (USDC or EURC), and glideTag. Never navigate to /request for money requests.
14. Split and request may use EURC — include token in JSON when user says EURC or €.

Respond with JSON only:
- {"action":"reply","message":"..."} — only when info is still missing
- {"action":"send","amount":"1.00","token":"USDC","to":"0x..."} OR {"action":"send","amount":"1.00","token":"EURC","to":"khadee","recipientName":"Khadee"}
- {"action":"send_batch","transfers":[{"amount":"1.00","token":"USDC"},{"amount":"1.00","token":"EURC"}],"to":"fifi"}
- {"action":"swap","amount":"5.00"}
- {"action":"bridge","amount":"10.00","network":"base"|"ethereum"|"polygon"|"arbitrum"}
- {"action":"request","amount":"10.00","token":"USDC","glideTag":"khadee"}
- {"action":"request","amount":"5.00","token":"EURC","glideTag":"fifi"}
- {"action":"split","total":"60.00","token":"USDC","recipients":["khadee","tom"]} — equal shares, usernames only
- {"action":"navigate","path":"/send"|"/payments"|"/trade"|"/ask"|"/receive"|"/activity"|"/scheduled"|"/profile"|"/contacts"}`;

const BRIDGE_NETWORKS = new Set(["ethereum", "base", "polygon", "arbitrum"]);

export function parseAgentJson(raw: string): GlideIntent | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const data = JSON.parse(cleaned) as Record<string, unknown>;
    const action = data.action;
    if (action === "reply" && typeof data.message === "string" && data.message.trim()) {
      return { action: "reply", message: data.message.trim() };
    }
    if (action === "send" && typeof data.amount === "string" && typeof data.to === "string") {
      const token =
        typeof data.token === "string" &&
        data.token.trim().toUpperCase() === "EURC"
          ? "EURC"
          : "USDC";
      return {
        action: "send",
        amount: data.amount.trim(),
        to: data.to.trim(),
        token,
        ...(typeof data.recipientName === "string" && data.recipientName.trim()
          ? { recipientName: data.recipientName.trim() }
          : {}),
      };
    }
    if (
      action === "send_batch" &&
      Array.isArray(data.transfers) &&
      typeof data.to === "string"
    ) {
      const transfers: SendTransfer[] = [];
      for (const row of data.transfers) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        if (typeof r.amount !== "string" || typeof r.token !== "string") continue;
        const token = r.token.trim().toUpperCase();
        if (token !== "USDC" && token !== "EURC") continue;
        transfers.push({
          amount: r.amount.trim(),
          token,
        });
      }
      if (transfers.length >= 2) {
        return {
          action: "send_batch",
          transfers,
          to: data.to.trim(),
          ...(typeof data.recipientName === "string" && data.recipientName.trim()
            ? { recipientName: data.recipientName.trim() }
            : {}),
        };
      }
    }
    if (action === "swap" && typeof data.amount === "string") {
      return { action: "swap", amount: data.amount.trim() };
    }
    if (
      action === "bridge" &&
      typeof data.amount === "string" &&
      typeof data.network === "string" &&
      BRIDGE_NETWORKS.has(data.network)
    ) {
      return {
        action: "bridge",
        amount: data.amount.trim(),
        network: data.network as BridgeNetwork,
      };
    }
    if (
      action === "request" &&
      typeof data.amount === "string" &&
      typeof data.glideTag === "string"
    ) {
      const token =
        typeof data.token === "string" &&
        data.token.trim().toUpperCase() === "EURC"
          ? "EURC"
          : "USDC";
      return {
        action: "request",
        amount: data.amount.trim(),
        token,
        glideTag: data.glideTag.trim().replace(/^@/, ""),
        ...(typeof data.note === "string" && data.note.trim()
          ? { note: data.note.trim() }
          : {}),
      };
    }
    if (
      action === "split" &&
      typeof data.total === "string" &&
      Array.isArray(data.recipients)
    ) {
      const recipients = data.recipients
        .filter((r): r is string => typeof r === "string")
        .map((r) => r.trim().replace(/^@/, ""))
        .filter(Boolean);
      const token =
        typeof data.token === "string" &&
        data.token.trim().toUpperCase() === "EURC"
          ? "EURC"
          : "USDC";
      if (recipients.length >= 2) {
        return { action: "split", total: data.total.trim(), recipients, token };
      }
    }
    if (action === "navigate" && typeof data.path === "string") {
      return { action: "navigate", path: data.path.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

/** Override vague LLM replies when the thread already has enough to send. */
export async function reconcileIntentWithHistory(
  intent: GlideIntent | null,
  history: AgentHistoryMessage[],
  latestUserMessage: string,
  userId?: string,
): Promise<GlideIntent | null> {
  const fullHistory: AgentHistoryMessage[] = [
    ...history,
    { role: "user", content: latestUserMessage },
  ];

  const explicit = parseExplicitIntentFromMessage(latestUserMessage);
  if (explicit) return explicit;

  const multiSend = parseMultiSendFromMessage(latestUserMessage);
  if (multiSend) {
    return {
      action: "send_batch",
      transfers: multiSend.transfers,
      to: multiSend.to,
    };
  }

  const singleSend = parseSendFromMessage(latestUserMessage);
  if (singleSend) {
    return {
      action: "send",
      amount: singleSend.amount,
      token: singleSend.token,
      to: singleSend.to,
    };
  }

  const request = parseRequestFromMessage(latestUserMessage);
  if (request) return { action: "request", ...request };

  const split = parseSplitFromMessage(latestUserMessage);
  if (split) return { action: "split", ...split };

  if (/\bsplit\b/i.test(latestUserMessage)) {
    const parsedRecipients = extractSplitRecipients(latestUserMessage);
    const recipients =
      parsedRecipients.length >= 2
        ? parsedRecipients
        : intent?.action === "split"
          ? intent.recipients
          : [];
    const billTotal = extractAmountFromHistory(fullHistory);

    if (billTotal && recipients.length >= 2) {
      return {
        action: "split",
        total: billTotal,
        recipients,
        token: extractTokenFromText(latestUserMessage) ?? "USDC",
      };
    }
    if (recipients.length >= 2) {
      return {
        action: "reply",
        message: "How much was the total bill?",
      };
    }
    if (billTotal) {
      return {
        action: "reply",
        message: "Who should I split with? Tag at least two @usernames.",
      };
    }
    return {
      action: "reply",
      message:
        'To split a bill, say the total and friends — e.g. "Split $60 with @fifi and @khadee".',
    };
  }

  if (intent?.action === "split") {
    const billTotal = extractAmountFromHistory(fullHistory);
    if (!billTotal) {
      if (intent.recipients.length >= 2) {
        return {
          action: "reply",
          message: "How much was the total bill?",
        };
      }
      return {
        action: "reply",
        message:
          'To split a bill, say the total and friends — e.g. "Split $60 with @fifi and @khadee".',
      };
    }
    return {
      action: "split",
      total: billTotal,
      recipients: intent.recipients,
      token: intent.token ?? extractTokenFromText(latestUserMessage) ?? "USDC",
    };
  }

  if (intent?.action === "swap" || intent?.action === "bridge") {
    return intent;
  }

  if (/\brequest\b/i.test(latestUserMessage)) {
    const req = parseRequestFromMessage(latestUserMessage);
    if (req) return { action: "request", ...req };
    const amount = extractAmountFromHistory(fullHistory);
    const handle = extractUsernameFromHistory(fullHistory);
    if (amount && handle) {
      return {
        action: "request",
        amount,
        token: extractTokenFromText(latestUserMessage) ?? "USDC",
        glideTag: handle,
      };
    }
    return {
      action: "reply",
      message: "How much should I request, and from who? Use @username.",
    };
  }

  if (isNonSendMoneyMessage(latestUserMessage)) {
    return (
      intent ?? {
        action: "reply",
        message: "How much USDC should I swap or bridge?",
      }
    );
  }

  const ready = canExecuteSendFromHistory(fullHistory);
  if (ready && !isNonSendMoneyMessage(latestUserMessage)) {
    const token = extractTokenFromText(latestUserMessage) ?? "USDC";
    return {
      action: "send",
      amount: ready.amount,
      to: ready.to,
      token,
      recipientName: ready.recipientName,
    };
  }

  if (userId && !isNonSendMoneyMessage(latestUserMessage)) {
    const amount = extractAmountFromHistory(fullHistory);
    const handle = extractUsernameFromHistory(fullHistory);
    if (handle && amount && !extractWalletFromHistory(fullHistory)) {
      const glideUser = await findUserByUsername(handle);
      if (glideUser?.circleWalletAddress) {
        const token = extractTokenFromText(latestUserMessage) ?? "USDC";
        return {
          action: "send",
          amount,
          to: glideUser.circleWalletAddress,
          token,
          recipientName: glideUser.displayName ?? glideUser.username,
        };
      }
    }

    const name = extractRecipientNameFromHistory(fullHistory);
    if (name && amount && !extractWalletFromHistory(fullHistory)) {
      const token = extractTokenFromText(latestUserMessage) ?? "USDC";
      const contact = await findContactByName(userId, name);
      if (contact) {
        return {
          action: "send",
          amount,
          to: contact.walletAddress,
          token,
          recipientName: contact.name,
        };
      }
      const glideUser = await findUserByUsername(normalizeUsername(name));
      if (glideUser?.circleWalletAddress) {
        return {
          action: "send",
          amount,
          to: glideUser.circleWalletAddress,
          token,
          recipientName: glideUser.displayName ?? glideUser.username,
        };
      }
    }
  }

  if (intent?.action === "send") {
    const inferred = extractTokenFromText(latestUserMessage);
    if (inferred && intent.token !== inferred) {
      intent = { ...intent, token: inferred };
    }
  }

  if (!intent || intent.action !== "reply") return intent;

  const msg = intent.message.toLowerCase();
  const hasAddress = Boolean(extractWalletFromHistory(fullHistory));
  const hasAmount = Boolean(extractAmountFromHistory(fullHistory));

  const reAskingAddress =
    hasAddress &&
    (msg.includes("wallet address") || msg.includes("0x address") || msg.includes("address you"));
  const reAskingAmount =
    hasAmount &&
    (msg.includes("how much") || msg.includes("what amount") || msg.includes("amount would"));

  if (reAskingAddress || reAskingAmount) {
    if (!hasAddress) {
      return { action: "reply", message: "What's their wallet address? (0x…)" };
    }
    if (!hasAmount) {
      return { action: "reply", message: "How much should I send?" };
    }
  }

  return intent;
}
