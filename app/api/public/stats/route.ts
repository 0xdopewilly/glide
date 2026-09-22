import { NextResponse } from "next/server";
import {
  daysAgo,
  getSweepStats,
  getTransferStats,
  getUserStats,
} from "@/lib/metrics";
import { GLIDE_NETWORK } from "@/lib/network";

/**
 * Public, anonymized stats endpoint.
 *
 * Returns the safe subset of admin stats — no PII, no recent-tx list, no error
 * logs. Intended for partners (e.g. Arc team) and a live public dashboard.
 *
 * Cached for 60 seconds; CORS open to any origin (read-only metrics).
 */

const PUBLIC_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: PUBLIC_CACHE_HEADERS,
  });
}

export async function GET() {
  try {
    const since7d = daysAgo(7);
    const [users, transfers, transfers7d, sweeps, sweeps7d] = await Promise.all([
      getUserStats(),
      getTransferStats(),
      getTransferStats(since7d),
      getSweepStats(),
      getSweepStats(since7d),
    ]);

    const body = {
      generatedAt: new Date().toISOString(),
      network: GLIDE_NETWORK,
      users: {
        total: users.total,
        signupsLast7d: users.signupsLast7d,
        signupsLast30d: users.signupsLast30d,
        activeLast7d: users.activeLast7d,
        activeLast30d: users.activeLast30d,
      },
      // Distinct on-chain payments (see lib/metrics.ts for counting rules).
      transactions: {
        total: transfers.count,
        last7d: transfers7d.count,
        volumeUSDC: transfers.volumeByToken.USDC ?? 0,
        volumeEURC: transfers.volumeByToken.EURC ?? 0,
      },
      // Settled sweeps only; failed / in-flight reported separately.
      universalReceive: {
        total: sweeps.settled,
        last7d: sweeps7d.settled,
        failed: sweeps.failed,
        inFlight: sweeps.inFlight,
        bySource: sweeps.settledBySource,
        medianSweepSeconds: sweeps.medianSeconds,
      },
    };

    return NextResponse.json(body, { headers: PUBLIC_CACHE_HEADERS });
  } catch {
    return NextResponse.json(
      { error: "stats unavailable" },
      { status: 503, headers: PUBLIC_CACHE_HEADERS },
    );
  }
}
