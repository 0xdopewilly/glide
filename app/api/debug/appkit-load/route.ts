import { NextResponse } from "next/server";

/** Tests whether the @circle-fin/app-kit module itself loads cleanly on
 *  Vercel. If THIS errors but /api/debug/ping is fine, App Kit is the
 *  culprit (likely a serverless bundling issue with a node-native dep). */
export async function GET() {
  try {
    const { AppKit } = await import("@circle-fin/app-kit");
    const { ArcTestnet } = await import("@circle-fin/app-kit/chains");
    return NextResponse.json({
      ok: true,
      hasAppKit: typeof AppKit === "function",
      arcChainId: ArcTestnet.chainId,
      arcRpc: ArcTestnet.rpcEndpoints[0],
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json(
      {
        ok: false,
        name: e?.name,
        message: e?.message,
        stack: e?.stack?.split("\n").slice(0, 6),
      },
      { status: 200 },
    );
  }
}
