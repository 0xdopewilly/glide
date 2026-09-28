import { isAdminUser } from "@/lib/admin";
import { requireSessionUser, isAuthError } from "@/lib/api-auth";
import { safeApiError } from "@/lib/circle";
import {
  describeGasWallet,
  forgetGasWallet,
  gasWalletRefId,
  resolveGasWallet,
} from "@/lib/gas-refill";
import { EXTERNAL_CHAINS, type ExternalChainKey } from "@/lib/network";
import { createWalletOnChain } from "@/lib/wallet-service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const SUPPORTED = new Set(
  (Object.keys(EXTERNAL_CHAINS) as ExternalChainKey[]).map(
    (key) => EXTERNAL_CHAINS[key].circleBlockchain,
  ),
);

/** Admin: provision the Universal Receive gas service wallet for a chain.
 * Body: { chain: "BASE" | "ARB" | "MATIC" | "ETH" } (Circle blockchain id).
 * Creates a Circle EOA tagged with the chain's gas refId, so it's found
 * without an env var; the chain goes live on its own once the wallet holds
 * enough native gas. An EOA, not an SCA: it only ever sends native gas and
 * pays its own fees, so it doesn't depend on a Gas Station policy.
 * Idempotent: returns the existing gas wallet if there is one. */
export async function POST(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  if (!isAdminUser(session.userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { chain?: string };
  const chain = body.chain?.trim() ?? "";
  if (!SUPPORTED.has(chain)) {
    return NextResponse.json(
      { error: "Unsupported chain", supported: [...SUPPORTED] },
      { status: 400 },
    );
  }

  try {
    forgetGasWallet(chain);
    const existing = await resolveGasWallet(chain);
    if (!existing) {
      await createWalletOnChain(chain, {
        accountType: "EOA",
        name: `glidepay gas ${chain}`,
        refId: gasWalletRefId(chain),
      });
      forgetGasWallet(chain);
    }
    return NextResponse.json({
      created: !existing,
      status: await describeGasWallet(chain),
    });
  } catch (err) {
    console.error("[Glide] gas wallet create:", err);
    return NextResponse.json({ error: safeApiError(err) }, { status: 502 });
  }
}
