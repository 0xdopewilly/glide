import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

const SOURCE_LABEL_TO_KEY: Record<string, "base" | "ethereum" | "polygon" | "arbitrum"> = {
  Base: "base",
  Ethereum: "ethereum",
  Polygon: "polygon",
  Arbitrum: "arbitrum",
};

function parseAmount(label: string | null | undefined): number {
  if (!label) return 0;
  const cleaned = label.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: PUBLIC_CACHE_HEADERS,
  });
}

export async function GET() {
  try {
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      signupsLast7d,
      signupsLast30d,
      totalTransactions,
      transactionsLast7d,
      volumeRows,
      sweepsByChain,
      sweepsLast7d,
      completedSweepDurations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.user.count({ where: { createdAt: { gte: since30d } } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { gte: since7d } } }),
      // Volume by token. Token lives in metadata.token (string column does
      // not exist). amountLabel is a display string like "+$12.50" — strip
      // non-numeric chars before summing. Exclude failed rows.
      prisma.$queryRaw<Array<{ token: string; total: number }>>`
        SELECT
          COALESCE("metadata"->>'token', 'USDC') AS token,
          COALESCE(
            SUM(
              CAST(
                NULLIF(REGEXP_REPLACE("amountLabel", '[^0-9.]', '', 'g'), '')
                AS NUMERIC
              )
            ),
            0
          )::float AS total
        FROM "Transaction"
        WHERE "kind" IN ('send', 'receive')
          AND ("status" IS NULL OR "status" <> 'failed')
        GROUP BY 1
      `,
      prisma.transaction.groupBy({
        by: ["originChain"],
        where: { kind: "receive", originChain: { not: null } },
        _count: { _all: true },
      }),
      prisma.transaction.count({
        where: {
          kind: "receive",
          originChain: { not: null },
          createdAt: { gte: since7d },
        },
      }),
      prisma.transaction.findMany({
        where: {
          kind: "receive",
          originChain: { not: null },
          // "complete" or "confirmed" — completeSweep writes whichever Circle
          // returns; both indicate a successful sweep.
          status: { in: ["complete", "confirmed"] },
        },
        select: { createdAt: true, updatedAt: true },
        // Cap for a sane query — median is stable beyond a few thousand rows.
        take: 5000,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const volumeByToken: Record<string, number> = {};
    for (const row of volumeRows) {
      volumeByToken[row.token] = Number(row.total) || 0;
    }

    const bySource: { base: number; ethereum: number; polygon: number; arbitrum: number } = {
      base: 0,
      ethereum: 0,
      polygon: 0,
      arbitrum: 0,
    };
    let universalReceiveTotal = 0;
    for (const row of sweepsByChain) {
      const count = row._count._all;
      universalReceiveTotal += count;
      const key = row.originChain ? SOURCE_LABEL_TO_KEY[row.originChain] : undefined;
      if (key) bySource[key] += count;
    }

    const durationsSec = completedSweepDurations
      .map((r) => (r.updatedAt.getTime() - r.createdAt.getTime()) / 1000)
      .filter((d) => d >= 0 && Number.isFinite(d));
    const medianSweepSeconds = median(durationsSec);

    const body = {
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        signupsLast7d,
        signupsLast30d,
      },
      transactions: {
        total: totalTransactions,
        last7d: transactionsLast7d,
        volumeUSDC: volumeByToken.USDC ?? 0,
        volumeEURC: volumeByToken.EURC ?? 0,
      },
      universalReceive: {
        total: universalReceiveTotal,
        last7d: sweepsLast7d,
        bySource,
        medianSweepSeconds:
          medianSweepSeconds === null ? null : Math.round(medianSweepSeconds),
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
