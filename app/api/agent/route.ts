import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import type { AgentHistoryMessage } from "@/lib/agent-context";
import {
  AGENT_SYSTEM_PROMPT,
  parseAgentJson,
  reconcileIntentWithHistory,
  type GlideIntent,
} from "@/lib/agent-intents";
import { findContactByName } from "@/lib/contacts-db";
import { safeApiError } from "@/lib/circle";
import { groqChat, type GroqMessage } from "@/lib/groq";
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
    return {
      reply: `Sending $${amount.toFixed(2)}…`,
      intent: { ...intent, amount: amount.toFixed(2) },
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
  return { reply: "How can I help?" };
}

async function resolveSendRecipient(
  userId: string,
  intent: GlideIntent & { action: "send" },
): Promise<GlideIntent & { action: "send" }> {
  if (isValidWalletAddress(intent.to)) return intent;
  const contact = await findContactByName(userId, intent.to);
  if (contact) {
    return {
      ...intent,
      to: contact.walletAddress,
      recipientName: intent.recipientName ?? contact.name,
    };
  }
  return intent;
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
