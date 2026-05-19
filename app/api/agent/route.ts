import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { AGENT_SYSTEM_PROMPT, parseAgentJson, type GlideIntent } from "@/lib/agent-intents";
import { safeApiError } from "@/lib/circle";
import { groqChat } from "@/lib/groq";
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
      return { reply: "What amount should I send?" };
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

/** POST { message } — Groq-powered Glide assistant (returns intent for client execution) */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const raw = await groqChat(
      [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      { json: true },
    );

    const intent = parseAgentJson(raw);
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
