import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import type { AgentHistoryMessage } from "@/lib/agent-context";
import {
  AGENT_SYSTEM_PROMPT,
  parseAgentJson,
  reconcileIntentWithHistory,
  type GlideIntent,
} from "@/lib/agent-intents";
import {
  formatStableAmount,
  formatStableAmountWithCode,
} from "@/lib/currency-format";
import { safeApiError } from "@/lib/circle";
import { groqChat, type GroqMessage } from "@/lib/groq";
import { resolveRecipient } from "@/lib/resolve-recipient";
import { formatSplitProcessingReply } from "@/lib/split-bill";
import { isValidWalletAddress, parseMoneyAmount } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";

function intentReply(intent: GlideIntent): { reply: string; intent?: GlideIntent } {
  if (intent.action === "reply") {
    return { reply: intent.message };
  }
  if (intent.action === "navigate") {
    return { reply: "Opening that for you.", intent };
  }
  if (intent.action === "send") {
    if (!isValidWalletAddress(intent.to)) {
      return { reply: "I need a valid 0x wallet address to send." };
    }
    const amount = parseMoneyAmount(intent.amount);
    if (amount === null || amount <= 0) {
      return { reply: "How much should I send?" };
    }
    const token = intent.token ?? "USDC";
    return {
      reply: `Sending ${formatStableAmount(amount, token)}…`,
      intent: { ...intent, amount: amount.toFixed(2), token },
    };
  }
  if (intent.action === "send_batch") {
    if (!isValidWalletAddress(intent.to)) {
      return { reply: "I need a valid recipient to send." };
    }
    const normalized = intent.transfers.map((t) => {
      const amount = parseMoneyAmount(t.amount);
      if (amount === null || amount <= 0) return null;
      return { amount: amount.toFixed(2), token: t.token };
    });
    if (normalized.some((t) => t === null)) {
      return { reply: "How much of each token should I send?" };
    }
    const transfers = normalized.filter(
      (t): t is { amount: string; token: "USDC" | "EURC" } => t !== null,
    );
    const summary = transfers
      .map((t) => formatStableAmountWithCode(t.amount, t.token))
      .join(" and ");
    return {
      reply: `Sending ${summary}…`,
      intent: { ...intent, transfers },
    };
  }
  if (intent.action === "swap") {
    const amount = parseMoneyAmount(intent.amount);
    if (amount === null || amount <= 0) {
      return { reply: "How much USDC should I swap?" };
    }
    return {
      reply: `Swapping $${amount.toFixed(2)} to EURC…`,
      intent: { ...intent, amount: amount.toFixed(2) },
    };
  }
  if (intent.action === "bridge") {
    const amount = parseMoneyAmount(intent.amount);
    if (amount === null || amount <= 0) {
      return { reply: "How much should I bridge?" };
    }
    return {
      reply: `Bridging $${amount.toFixed(2)}…`,
      intent: { ...intent, amount: amount.toFixed(2) },
    };
  }
  if (intent.action === "split") {
    const total = parseMoneyAmount(intent.total);
    if (total === null || total <= 0) {
      return { reply: "How much should I split?" };
    }
    if (intent.recipients.length < 2) {
      return { reply: "Who should I split with? Tag at least two @usernames." };
    }
    return {
      reply: formatSplitProcessingReply(
        total.toFixed(2),
        intent.recipients.length,
      ),
      intent: { ...intent, total: total.toFixed(2) },
    };
  }
  return { reply: "How can I help?" };
}

async function resolveSendRecipient(
  userId: string,
  intent: GlideIntent & { action: "send" },
): Promise<GlideIntent & { action: "send" }> {
  const resolved = await resolveRecipient(userId, intent.to);
  if (!resolved) return intent;
  return {
    ...intent,
    to: resolved.address,
    recipientName:
      intent.recipientName ??
      (resolved.source === "contact" || resolved.source === "username"
        ? resolved.label.replace(/^@/, "")
        : undefined),
  };
}

async function resolveSendBatchRecipient(
  userId: string,
  intent: GlideIntent & { action: "send_batch" },
): Promise<GlideIntent & { action: "send_batch" }> {
  const resolved = await resolveRecipient(userId, intent.to);
  if (!resolved) return intent;
  return {
    ...intent,
    to: resolved.address,
    recipientName:
      intent.recipientName ??
      (resolved.source === "contact" || resolved.source === "username"
        ? resolved.label.replace(/^@/, "")
        : undefined),
  };
}

/** POST { message, history? } — Groq assistant with full conversation context */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as {
    message?: string;
    history?: AgentHistoryMessage[];
  };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const history = (body.history ?? []).filter(
    (m) =>
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string",
  );

  try {
    const groqMessages: GroqMessage[] = [
      { role: "system", content: AGENT_SYSTEM_PROMPT },
      ...history.slice(-24).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const raw = await groqChat(groqMessages, { json: true });
    let intent = parseAgentJson(raw);
    intent = await reconcileIntentWithHistory(
      intent,
      history,
      message,
      session.userId,
    );

    if (intent?.action === "send") {
      intent = await resolveSendRecipient(session.userId, intent);
    }
    if (intent?.action === "send_batch") {
      intent = await resolveSendBatchRecipient(session.userId, intent);
    }

    if (!intent) {
      return NextResponse.json({
        reply:
          "I didn't quite get that. Try “Send $5 to 0x…” or “Swap $10 to EURC”.",
      });
    }

    return NextResponse.json(intentReply(intent));
  } catch (err) {
    console.error("[Glide] agent:", err);
    const msg = safeApiError(err);
    return NextResponse.json({ error: msg, reply: msg }, { status: 502 });
  }
}
