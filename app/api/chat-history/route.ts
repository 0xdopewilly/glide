import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const MAX_MESSAGES = 80;

/** GET — return the user's Billy chat history (or empty array). */
export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { chatHistory: true },
  });

  const history = Array.isArray(user?.chatHistory) ? user.chatHistory : [];
  return NextResponse.json({ messages: history });
}

/** PUT { messages } — snapshot the user's chat history. Last write wins. */
export async function PUT(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { messages?: unknown };
  if (!Array.isArray(body.messages)) {
    return NextResponse.json(
      { error: "messages must be an array" },
      { status: 400 },
    );
  }

  const trimmed = body.messages.slice(-MAX_MESSAGES);

  await prisma.user.update({
    where: { id: session.userId },
    data: { chatHistory: trimmed },
  });

  return NextResponse.json({ ok: true });
}
