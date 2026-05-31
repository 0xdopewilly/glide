import type { GlideIntent } from "@/lib/agent-intents";

/** Parses /-style commands so power users can skip the LLM entirely.
 * Returns a fully-formed intent (no LLM round-trip needed) or null if the
 * input isn't a recognized command. */
export function parseSlashCommand(input: string): GlideIntent | null {
  const text = input.trim();
  if (!text.startsWith("/")) return null;

  const tokens = text.slice(1).split(/\s+/);
  const cmd = tokens[0]?.toLowerCase();
  const rest = tokens.slice(1);

  if (cmd === "send" || cmd === "pay") {
    // /send 5 @khadee | /send $5 @khadee | /send 5 0x... | /send 0.001 cirbtc @khadee
    const amount = extractAmount(rest);
    const token = extractToken(rest);
    const to = extractRecipient(rest);
    if (amount && to) {
      return {
        action: "send",
        amount,
        token: token ?? "USDC",
        to,
      };
    }
  }

  if (cmd === "swap") {
    // /swap 5 | /swap $5
    const amount = extractAmount(rest);
    if (amount) return { action: "swap", amount };
  }

  if (cmd === "bridge") {
    // /bridge 5 base | /bridge $5 to ethereum
    const amount = extractAmount(rest);
    const network = rest.find((t) =>
      /^(base|ethereum|polygon|arbitrum)$/i.test(t),
    );
    if (amount && network) {
      return {
        action: "bridge",
        amount,
        network: network.toLowerCase() as
          | "base"
          | "ethereum"
          | "polygon"
          | "arbitrum",
      };
    }
  }

  if (cmd === "request") {
    // /request 10 @khadee
    const amount = extractAmount(rest);
    const handle = rest
      .map((t) => t.replace(/^@/, ""))
      .find((t) => /^[a-z][a-z0-9_]{2,19}$/i.test(t));
    if (amount && handle) {
      return {
        action: "request",
        amount,
        token: extractToken(rest) ?? "USDC",
        glideTag: handle,
      };
    }
  }

  if (cmd === "balance") {
    return {
      action: "navigate",
      path: "/",
    };
  }

  if (cmd === "activity") {
    return {
      action: "navigate",
      path: "/activity",
    };
  }

  if (cmd === "receive") {
    return {
      action: "navigate",
      path: "/receive",
    };
  }

  if (cmd === "help" || cmd === "commands") {
    return {
      action: "reply",
      message: `Slash commands:
  /send <amount> <recipient> — e.g. /send 5 @khadee
  /pay  <amount> <recipient> — alias for /send
  /swap <amount>             — USDC → EURC
  /bridge <amount> <network> — base / ethereum / polygon / arbitrum
  /request <amount> @user    — ask someone to pay you
  /balance                   — open Home
  /activity                  — open Activity
  /receive                   — show your address`,
    };
  }

  return null;
}

function extractAmount(tokens: string[]): string | null {
  for (const t of tokens) {
    const m = t.match(/^\$?(\d+(?:\.\d{1,8})?)$/);
    if (m) {
      const n = parseFloat(m[1]);
      if (Number.isFinite(n) && n > 0) return m[1];
    }
  }
  return null;
}

function extractToken(tokens: string[]): "USDC" | "EURC" | "cirBTC" | null {
  for (const t of tokens) {
    const u = t.toLowerCase();
    if (u === "usdc") return "USDC";
    if (u === "eurc") return "EURC";
    if (u === "cirbtc") return "cirBTC";
  }
  return null;
}

function extractRecipient(tokens: string[]): string | null {
  // 0x address
  const addr = tokens.find((t) => /^0x[a-fA-F0-9]{40}$/.test(t));
  if (addr) return addr;
  // @username
  const handle = tokens.find((t) =>
    /^@[a-z][a-z0-9_]{2,19}$/i.test(t),
  );
  if (handle) return handle.replace(/^@/, "");
  // bare username (only if not a token name or network)
  const bare = tokens.find(
    (t) =>
      /^[a-z][a-z0-9_]{2,19}$/i.test(t) &&
      !/^(usdc|eurc|cirbtc|to|from|base|ethereum|polygon|arbitrum)$/i.test(t),
  );
  return bare ?? null;
}
