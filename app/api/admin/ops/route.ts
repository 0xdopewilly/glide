import { isAdminUser } from "@/lib/admin";
import { requireSessionUser, isAuthError } from "@/lib/api-auth";
import { describeGasWallet, type GasWalletStatus } from "@/lib/gas-refill";
import {
  EXTERNAL_CHAINS,
  GLIDE_NETWORK,
  type ExternalChainKey,
} from "@/lib/network";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

export type OpsChain = {
  key: ExternalChainKey;
  label: string;
  minSweepUsd: number;
  status: GasWalletStatus | null;
  error?: string;
};

/** GET — the Operations screen. Everyone gets { isAdmin, userId } (the id
 * is what GLIDE_ADMIN_USER_ID must be set to); `?summary=1` stops there.
 * The admin also gets each Universal Receive chain's gas wallet status. */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;
  const isAdmin = isAdminUser(session.userId);
  if (!isAdmin || request.nextUrl.searchParams.has("summary")) {
    return NextResponse.json({ isAdmin, userId: session.userId });
  }

  const chains: OpsChain[] = await Promise.all(
    (Object.keys(EXTERNAL_CHAINS) as ExternalChainKey[]).map(async (key) => {
      const def = EXTERNAL_CHAINS[key];
      const base = { key, label: def.label, minSweepUsd: def.minSweepUsd };
      try {
        return { ...base, status: await describeGasWallet(def.circleBlockchain) };
      } catch (err) {
        console.error("[Glide] ops gas wallet:", key, err);
        return { ...base, status: null, error: "Couldn't reach Circle. Try again." };
      }
    }),
  );
  return NextResponse.json({
    isAdmin,
    userId: session.userId,
    network: GLIDE_NETWORK,
    chains,
  });
}
