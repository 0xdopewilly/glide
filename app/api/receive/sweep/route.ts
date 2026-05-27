import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { sweepStuckBalance } from "@/lib/cctp-receive";
import { type ReceiveChainKey, RECEIVE_CHAINS, safeApiError } from "@/lib/circle";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_CHAINS = new Set(Object.keys(RECEIVE_CHAINS)) as Set<string>;

/** Manually bridge a user's stuck source-chain USDC to Arc. Used to recover
 * funds whose Circle webhook events were already delivered (and therefore
 * won't re-fire). */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    const body = (await request.json()) as { chain?: string };
    const chain = body.chain?.trim();
    if (!chain || !VALID_CHAINS.has(chain)) {
      return NextResponse.json({ error: "Unsupported chain" }, { status: 400 });
    }

    const result = await sweepStuckBalance({
      userId: session.userId,
      chain: chain as ReceiveChainKey,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[Glide] sweep:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
