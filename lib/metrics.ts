// Shared, reportable usage metrics — the single definition behind the Arc
// partner page, /api/public/stats and /admin, so the numbers can't disagree.
//
// Counting rules (see prisma/schema.prisma for the underlying rows):
//   - One Circle transfer between two glidepay users writes TWO rows: the
//     sender's "send" and the recipient's mirror "receive" (metadata.fromUserId
//     set). Mirrors are excluded; every remaining row is de-duplicated on its
//     on-chain txHash, so each transfer counts once.
//   - Rows in a failed state, and Universal Receive claims that haven't
//     settled ("pending"), never count toward transfers or volume.
//   - Token lives in metadata.token; amountLabel is a display string
//     ("+$12.50", "−€3.00", "+₿0.0003") — the magnitude is its digits.
//   - Universal Receive sweeps are "receive" rows with originChain set.
//     Completed sweeps are stored as "complete" (older rows: "success" /
//     "confirmed").
import { prisma } from "@/lib/db";
import { EXTERNAL_CHAINS, type ExternalChainKey } from "@/lib/network";

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

export type TransferStats = {
  /** Distinct settled-or-in-flight transfers (sends + inbound receives). */
  count: number;
  /** Volume per token symbol, in that token's units. */
  volumeByToken: Record<string, number>;
  countByToken: Record<string, number>;
};

/** Distinct payments on Arc since `since` (all time when omitted). */
export async function getTransferStats(since?: Date): Promise<TransferStats> {
  const from = since ?? new Date(0);
  const rows = await prisma.$queryRaw<
    Array<{ token: string; count: number; volume: number }>
  >`
    WITH transfers AS (
      SELECT DISTINCT ON (COALESCE("txHash", "id"))
        COALESCE(UPPER("metadata"->>'token'), 'USDC') AS token,
        COALESCE(
          CAST(
            NULLIF(REGEXP_REPLACE("amountLabel", '[^0-9.]', '', 'g'), '')
            AS NUMERIC
          ),
          0
        ) AS amount
      FROM "Transaction"
      WHERE "kind" IN ('send', 'receive')
        AND NOT ("kind" = 'receive' AND COALESCE("metadata" ? 'fromUserId', false))
        AND LOWER(COALESCE("status", '')) NOT IN
          ('failed', 'error', 'skipped', 'denied', 'cancelled', 'pending')
        AND "createdAt" >= ${from}
      ORDER BY COALESCE("txHash", "id"), "createdAt"
    )
    SELECT token, COUNT(*)::int AS count, COALESCE(SUM(amount), 0)::float AS volume
    FROM transfers
    GROUP BY token
  `;

  const volumeByToken: Record<string, number> = {};
  const countByToken: Record<string, number> = {};
  let count = 0;
  for (const row of rows) {
    // normalize "CIRBTC" (UPPER) back to its display symbol
    const token = row.token === "CIRBTC" ? "cirBTC" : row.token;
    volumeByToken[token] = Number(row.volume) || 0;
    countByToken[token] = Number(row.count) || 0;
    count += Number(row.count) || 0;
  }
  return { count, volumeByToken, countByToken };
}

export type SweepStats = {
  settled: number;
  failed: number;
  inFlight: number;
  /** Settled sweeps per source chain. */
  settledBySource: Record<ExternalChainKey, number>;
  /** Median seconds from claim to settlement, settled sweeps only. */
  medianSeconds: number | null;
};

function sourceKey(label: string | null): ExternalChainKey | null {
  if (!label) return null;
  for (const [key, def] of Object.entries(EXTERNAL_CHAINS)) {
    if (def.label === label) return key as ExternalChainKey;
  }
  return null;
}

/** Universal Receive sweeps into Arc since `since` (all time when omitted). */
export async function getSweepStats(since?: Date): Promise<SweepStats> {
  const from = since ?? new Date(0);
  const [bySource, median] = await Promise.all([
    prisma.$queryRaw<
      Array<{ origin: string | null; settled: number; failed: number; inflight: number }>
    >`
      SELECT
        "originChain" AS origin,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("status", '')) IN ('complete', 'success', 'confirmed'))::int AS settled,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("status", '')) IN ('failed', 'error'))::int AS failed,
        COUNT(*) FILTER (WHERE LOWER(COALESCE("status", '')) = 'pending')::int AS inflight
      FROM "Transaction"
      WHERE "kind" = 'receive' AND "originChain" IS NOT NULL AND "createdAt" >= ${from}
      GROUP BY 1
    `,
    // Claim → settled. Capped at 1h so rows touched much later (metadata
    // adoption by sync) can't skew it.
    prisma.$queryRaw<Array<{ median: number | null }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (
        ORDER BY EXTRACT(EPOCH FROM ("updatedAt" - "createdAt"))
      )::float AS median
      FROM "Transaction"
      WHERE "kind" = 'receive'
        AND "originChain" IS NOT NULL
        AND LOWER(COALESCE("status", '')) IN ('complete', 'success', 'confirmed')
        AND "updatedAt" - "createdAt" BETWEEN INTERVAL '0 seconds' AND INTERVAL '1 hour'
        AND "createdAt" >= ${from}
    `,
  ]);

  const settledBySource: Record<ExternalChainKey, number> = {
    base: 0,
    ethereum: 0,
    polygon: 0,
    arbitrum: 0,
  };
  let settled = 0;
  let failed = 0;
  let inFlight = 0;
  for (const row of bySource) {
    settled += Number(row.settled) || 0;
    failed += Number(row.failed) || 0;
    inFlight += Number(row.inflight) || 0;
    const key = sourceKey(row.origin);
    if (key) settledBySource[key] += Number(row.settled) || 0;
  }

  const m = median[0]?.median;
  return {
    settled,
    failed,
    inFlight,
    settledBySource,
    medianSeconds: m == null ? null : Math.round(Number(m)),
  };
}

export type UserStats = {
  total: number;
  signupsLast7d: number;
  signupsLast30d: number;
  /** Distinct users with any recorded activity in the window. */
  activeLast7d: number;
  activeLast30d: number;
};

async function activeUsersSince(since: Date): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ n: number }>>`
    SELECT COUNT(DISTINCT "userId")::int AS n
    FROM "Transaction"
    WHERE "createdAt" >= ${since}
  `;
  return Number(rows[0]?.n) || 0;
}

export async function getUserStats(): Promise<UserStats> {
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);
  const [total, signupsLast7d, signupsLast30d, activeLast7d, activeLast30d] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: since7d } } }),
      prisma.user.count({ where: { createdAt: { gte: since30d } } }),
      activeUsersSince(since7d),
      activeUsersSince(since30d),
    ]);
  return { total, signupsLast7d, signupsLast30d, activeLast7d, activeLast30d };
}
