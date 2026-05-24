import { isAuthError, requireSessionUser } from "@/lib/api-auth";
import { getOrCreateWalletForUser } from "@/lib/users";

/**
 * Diagnostic: tries kit.estimateSwap with a tiny fixed input. Returns
 * text/plain so nothing about response serialization can swallow the
 * actual error. Auth required so this is not a public leak.
 * Remove once swap is stable.
 */
export const maxDuration = 30;

function safeStr(v: unknown): string {
  try {
    if (v === undefined || v === null) return String(v);
    if (typeof v === "string") return v;
    if (v instanceof Error) {
      const lines = [
        `name: ${v.name}`,
        `message: ${v.message}`,
        v.stack ? `stack:\n${v.stack}` : "",
        (v as { cause?: unknown }).cause
          ? `cause: ${safeStr((v as { cause?: unknown }).cause)}`
          : "",
      ].filter(Boolean);
      return lines.join("\n");
    }
    return JSON.stringify(v, null, 2);
  } catch (e) {
    return `[unstringifiable: ${(e as Error).message}]`;
  }
}

function text(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET() {
  let stage = "start";
  try {
    stage = "requireSessionUser";
    const session = await requireSessionUser();
    if (isAuthError(session)) return session;

    stage = "getOrCreateWalletForUser";
    const { wallet } = await getOrCreateWalletForUser({
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
    });

    stage = "import @/lib/app-kit";
    const { estimateArcSwap } = await import("@/lib/app-kit");

    stage = "kit.estimateSwap";
    const result = await estimateArcSwap({
      walletAddress: wallet.address,
      amountIn: "1.00",
      tokenIn: "USDC",
      tokenOut: "EURC",
    });

    return text(
      `OK\nwallet: ${wallet.address}\nresult:\n${safeStr(result)}`,
    );
  } catch (err) {
    return text(`FAIL at stage: ${stage}\n\n${safeStr(err)}`, 200);
  }
}
