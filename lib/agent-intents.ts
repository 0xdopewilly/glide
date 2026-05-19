export type GlideIntent =
  | { action: "reply"; message: string }
  | { action: "send"; amount: string; to: string }
  | { action: "swap"; amount: string }
  | { action: "bridge"; amount: string; network: BridgeNetwork }
  | { action: "navigate"; path: string };

export type BridgeNetwork = "ethereum" | "base" | "polygon" | "arbitrum";

export const AGENT_SYSTEM_PROMPT = `You are Glide, a friendly mobile wallet assistant on Arc testnet (USDC/EURC).
Users speak in plain language. Never mention gas, seed phrases, MetaMask, or Web3 jargon.

Respond with JSON only:
- {"action":"reply","message":"..."} for questions, greetings, or when info is missing
- {"action":"send","amount":"10.00","to":"0x..."} when user wants to pay someone (needs valid 0x address)
- {"action":"swap","amount":"5.00"} to convert USDC to EURC
- {"action":"bridge","amount":"10.00","network":"base"|"ethereum"|"polygon"|"arbitrum"}
- {"action":"navigate","path":"/scan"|"/receive"|"/activity"|"/profile"}

If amount or recipient is unclear, use reply and ask one short question. Amounts are USD strings like "10.00".`;

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
      return { action: "send", amount: data.amount.trim(), to: data.to.trim() };
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
