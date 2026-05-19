import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createContact, listContacts } from "@/lib/contacts-db";
import { safeApiError } from "@/lib/circle";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const contacts = await listContacts(session.userId);
  return NextResponse.json({ contacts });
}

export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { name?: string; walletAddress?: string };
  const name = body.name?.trim();
  const walletAddress = body.walletAddress?.trim();

  if (!name || !walletAddress) {
    return NextResponse.json(
      { error: "name and walletAddress are required" },
      { status: 400 },
    );
  }

  try {
    const contact = await createContact(session.userId, name, walletAddress);
    return NextResponse.json({ contact });
  } catch (err) {
    const message = safeApiError(err);
    const status = message.includes("Unique") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
