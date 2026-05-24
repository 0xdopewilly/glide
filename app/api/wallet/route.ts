import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { resolveWalletTotalUsd } from "@/lib/tokens";
import {
  fetchAllWalletTokenBalances,
  fetchWalletBalance,
  fetchWalletById,
} from "@/lib/wallet-service";
import { getOrCreateWalletForUser, userOwnsWallet } from "@/lib/users";
import { NextRequest, NextResponse } from "next/server";

async function walletPayload(
  walletId: string,
  address: string,
  options?: { includeOffArc?: boolean },
) {
  const includeOffArc = options?.includeOffArc ?? false;
  let tokens: Awaited<ReturnType<typeof fetchAllWalletTokenBalances>> = [];
  let balance = 0;

  try {
    [tokens, balance] = await Promise.all([
      fetchAllWalletTokenBalances(walletId, address, { includeOffArc }),
      fetchWalletBalance(walletId),
    ]);
  } catch (err) {
    console.error("[Glide] wallet balances:", err);
    tokens = await fetchAllWalletTokenBalances(walletId, address, {
      includeOffArc: false,
    });
    balance = tokens.find((t) => t.symbol === "USDC")?.amount ?? 0;
  }

  const totalUsd = resolveWalletTotalUsd(tokens, balance);

  return {
    wallet: { id: walletId, address },
    balance,
    tokens,
    totalUsd,
  };
}

function walletOptions(request: NextRequest) {
  const includeOffArc =
    request.nextUrl.searchParams.get("full") === "1" ||
    request.nextUrl.searchParams.get("offArc") === "1";
  return { includeOffArc };
}

/** GET - current user's wallet; optional ?walletId= with ownership check */
export async function GET(request: NextRequest) {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  const walletIdParam = request.nextUrl.searchParams.get("walletId");

  try {
    const { wallet, user } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    const targetId = walletIdParam?.trim() || wallet.id;

    if (walletIdParam && targetId !== wallet.id) {
      const owns = await userOwnsWallet(session.userId, targetId);
      if (!owns) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let address = wallet.address;
    if (targetId === wallet.id) {
      return NextResponse.json(await walletPayload(targetId, address));
    }

    const fromCircle = await fetchWalletById(targetId);
    address = fromCircle?.address ?? user.circleWalletAddress ?? address;
    return NextResponse.json(await walletPayload(targetId, address));
  } catch (err) {
    console.error("[Glide] wallet GET:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet error" },
      { status: 502 },
    );
  }
}

/** POST - get or create the authenticated user's Arc SCA */
export async function POST() {
  const session = await requireSessionUser();
  if (isAuthError(session)) return session;

  try {
    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });
    return NextResponse.json(
      await walletPayload(wallet.id, wallet.address, { includeOffArc: false }),
    );
  } catch (err) {
    console.error("[Glide] wallet POST:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Wallet setup failed" },
      { status: 502 },
    );
  }
}
