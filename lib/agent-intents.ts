import type { AgentHistoryMessage } from "@/lib/agent-context";
import {
  canExecuteSendFromHistory,
  extractAmountFromHistory,
  extractRecipientNameFromHistory,
  extractWalletFromHistory,
} from "@/lib/agent-context";

export type GlideIntent =
  | { action: "reply"; message: string }
  | { action: "send"; amount: string; to: string; recipientName?: string }
  | { action: "swap"; amount: string }
  | { action: "bridge"; amount: string; network: BridgeNetwork }
  | { action: "navigate"; path: string };

export type BridgeNetwork = "ethereum" | "base" | "polygon" | "arbitrum";

export const AGENT_SYSTEM_PROMPT = `You are Glide, a friendly mobile wallet assistant on Arc testnet (USDC).
Users speak in plain language. Never mention gas, seed phrases, MetaMask, or Web3 jargon.

You receive the FULL conversation history. Read every prior message before responding.

RULES (critical):
1. NEVER ask for a wallet address if the user already sent a 0x address in this conversation.
2. NEVER ask for an amount if the user already said how much (e.g. "$1", "$1.00", "1 dollar").
3. When you have BOTH a valid 0x address AND an amount from the conversation, you MUST respond with send JSON immediately — do not ask "what would you like to do".
4. Ask at most ONE clarifying question when something is truly missing.
5. Amounts are USD strings like "1.00". Addresses must be 0x + 40 hex chars.

Respond with JSON only:
- {"action":"reply","message":"..."} — only when info is still missing
- {"action":"send","amount":"1.00","to":"0x...","recipientName":"Khadee"} — optional recipientName if user named someone
- {"action":"swap","amount":"5.00"}
- {"action":"bridge","amount":"10.00","network":"base"|"ethereum"|"polygon"|"arbitrum"}
- {"action":"navigate","path":"/scan"|"/receive"|"/activity"|"/profile"|"/contacts"}`;

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
      return {
        action: "send",
        amount: data.amount.trim(),
        to: data.to.trim(),
        ...(typeof data.recipientName === "string" && data.recipientName.trim()
          ? { recipientName: data.recipientName.trim() }
          : {}),
      };
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
    if (action === "navigate" && typeof data.path === "string") {
      return { action: "navigate", path: data.path.trim() };
    }
    return null;
  } catch {
    return null;
  }
}

/** Override vague LLM replies when the thread already has enough to send. */
export function reconcileIntentWithHistory(
  intent: GlideIntent | null,
  history: AgentHistoryMessage[],
  latestUserMessage: string,
): GlideIntent | null {
  const fullHistory: AgentHistoryMessage[] = [
    ...history,
    { role: "user", content: latestUserMessage },
  ];

  const ready = canExecuteSendFromHistory(fullHistory);
  if (ready) {
    return {
      action: "send",
      amount: ready.amount,
      to: ready.to,
      recipientName: ready.recipientName,
    };
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
