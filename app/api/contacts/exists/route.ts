import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import {
  findContactByName,
  findContactByWallet,
} from "@/lib/contacts-db";
import { NextRequest, NextResponse } from "next/server";

/** GET ?wallet=0x…&name=Khadee - is this payee already saved? */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const wallet = request.nextUrl.searchParams.get("wallet")?.trim();
  const name = request.nextUrl.searchParams.get("name")?.trim();

  const byWallet = wallet
    ? await findContactByWallet(session.userId, wallet)
    : null;
  const byName = name ? await findContactByName(session.userId, name) : null;

  const contact = byWallet ?? byName;

  return NextResponse.json({
    exists: Boolean(contact),
    contact: contact
      ? { id: contact.id, name: contact.name, walletAddress: contact.walletAddress }
      : null,
  });
}
