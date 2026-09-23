import { NextResponse } from "next/server";

// TEMPORARY diagnostic: which server module fails to load on Vercel.
// Reports only error name/code/message per module — no env, no secrets.
export const dynamic = "force-dynamic";

const MODULES: Record<string, () => Promise<unknown>> = {
  "@circle-fin/developer-controlled-wallets": () => import("@circle-fin/developer-controlled-wallets"),
  "@circle-fin/app-kit/chains": () => import("@circle-fin/app-kit/chains"),
  "@circle-fin/app-kit": () => import("@circle-fin/app-kit"),
  "@circle-fin/adapter-circle-wallets": () => import("@circle-fin/adapter-circle-wallets"),
  "@/lib/circle": () => import("@/lib/circle"),
  "@/lib/chain-balances": () => import("@/lib/chain-balances"),
  "@/lib/wallet-service": () => import("@/lib/wallet-service"),
  "@/lib/users": () => import("@/lib/users"),
  "@/lib/api-auth": () => import("@/lib/api-auth"),
  "@/lib/push": () => import("@/lib/push"),
  "@/lib/app-kit": () => import("@/lib/app-kit"),
  "@/lib/cctp-receive": () => import("@/lib/cctp-receive"),
  "@/lib/settlement": () => import("@/lib/settlement"),
  "@/lib/bridge-resume": () => import("@/lib/bridge-resume"),
};

export async function GET() {
  const results: Record<string, string> = {};
  for (const [name, load] of Object.entries(MODULES)) {
    try {
      await load();
      results[name] = "ok";
    } catch (err) {
      const e = err as { name?: string; code?: string; message?: string };
      results[name] = `${e?.name ?? "Error"}${e?.code ? ` [${e.code}]` : ""}: ${String(e?.message ?? err).slice(0, 400)}`;
    }
  }
  return NextResponse.json({ node: process.version, results });
}
