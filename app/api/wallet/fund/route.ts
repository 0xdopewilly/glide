import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { createCircleClient, GLIDE_BLOCKCHAIN, safeApiError } from "@/lib/circle";
import { getUserById } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

/** POST { address } — testnet USDC (must be user's wallet address) */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const body = (await request.json()) as { address?: string };
  const address = body.address?.trim();

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const user = await getUserById(session.userId);
  if (!user?.circleWalletAddress || user.circleWalletAddress !== address) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const initialized = createCircleClient();
  if ("error" in initialized) {
    return NextResponse.json({ error: initialized.error }, { status: 500 });
  }

  try {
    await initialized.client.requestTestnetTokens({
      address,
      blockchain: GLIDE_BLOCKCHAIN,
      usdc: true,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Glide] wallet/fund:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
