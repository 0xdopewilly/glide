// Server-only stats aggregator for the admin dashboard.
//
// Notes on the underlying schema (see prisma/schema.prisma):
//   - Token (USDC / EURC / etc.) lives in `Transaction.metadata.token`, NOT
//     a column. We compute volume with a raw SQL query against the JSON column.
//   - `Transaction.amountLabel` is a display string (e.g. "+$12.50"). We strip
//     non-numeric chars to derive the magnitude.
//   - One Circle transfer creates TWO rows (debit on sender + credit on
//     recipient). For volume we count CREDIT rows only so we don't double-count.
//   - Universal Receive sweeps are `kind="receive"` rows with `originChain`
//     populated (e.g. "Base", "Ethereum"). No separate table exists.
//
// The Prisma client lives in `lib/db.ts` in this repo (no `lib/prisma.ts`).
import { prisma } from "@/lib/db";

type ByType = {
  send: number;
  receive: number;
  swap: number;
  bridge: number;
  bridgeIn: number;
};

type VolumeByToken = {
  usdc: number;
  eurc: number;
  cirbtc?: number;
};

type BySource = {
  base?: number;
  ethereum?: number;
  polygon?: number;
  arbitrum?: number;
};

export type AdminStats = {
  users: {
    total: number;
    signupsLast7d: number;
    signupsLast30d: number;
    dauLast24h: number;
    wauLast7d: number;
  };
  wallets: { total: number };
  transactions: {
    total: number;
    last7d: number;
    last30d: number;
    byType: ByType;
    volumeByToken: VolumeByToken;
    failed: number;
  };
  universalReceive: {
    total: number;
    last7d: number;
    bySource: BySource;
    // Without a per-source "createdAt on origin chain" column we cannot
    // compute end-to-end sweep latency reliably. Returning null until that
    // field exists in the schema.
    medianSweepSeconds: number | null;
  };
  recent: Array<{
    id: string;
    createdAt: Date;
    type: string;
    status: string;
    amount: string;
    token: string;
    handle?: string;
  }>;
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function activeUsersSince(since: Date): Promise<number> {
  const rows = await prisma.transaction.findMany({
    where: { createdAt: { gte: since } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
}

function normaliseSource(label: string | null | undefined): keyof BySource | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("base")) return "base";
  if (l.includes("eth")) return "ethereum";
  if (l.includes("polygon") || l.includes("matic")) return "polygon";
  if (l.includes("arb")) return "arbitrum";
  return null;
}

function normaliseToken(raw: string | null | undefined): keyof VolumeByToken | null {
  if (!raw) return null;
  const t = raw.toUpperCase();
  if (t === "USDC") return "usdc";
  if (t === "EURC") return "eurc";
  if (t === "CIRBTC" || t === "CBTC" || t === "BTC") return "cirbtc";
  return null;
}

function labelToNumber(label: string | null | undefined): number {
  if (!label) return 0;
  const cleaned = label.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function extractToken(metadata: unknown): string {
  if (metadata && typeof metadata === "object") {
    const t = (metadata as { token?: unknown }).token;
    if (typeof t === "string" && t.trim()) return t.toUpperCase();
  }
  return "USDC";
}

function extractHandle(
  metadata: unknown,
  kind: string,
  user: { username?: string | null; displayName?: string | null } | null,
): string | undefined {
  if (metadata && typeof metadata === "object") {
    const m = metadata as { recipient?: unknown; sender?: unknown };
    const value = kind === "receive" ? m.sender : m.recipient;
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  if (user?.username) return `@${user.username}`;
  if (user?.displayName) return user.displayName;
  return undefined;
}

export async function getAdminStats(): Promise<AdminStats> {
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);
  const since24h = daysAgo(1);

  const [
    totalUsers,
    signupsLast7d,
    signupsLast30d,
    dauLast24h,
    wauLast7d,
    walletsTotal,
    totalTransactions,
    txLast7d,
    txLast30d,
    byKindRows,
    failedCount,
    ursTotal,
    ursLast7d,
    sweepsByChainRows,
    volumeRows,
    recentRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since7d } } }),
    prisma.user.count({ where: { createdAt: { gte: since30d } } }),
    activeUsersSince(since24h),
    activeUsersSince(since7d),
    prisma.user.count({ where: { circleWalletId: { not: null } } }),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { createdAt: { gte: since7d } } }),
    prisma.transaction.count({ where: { createdAt: { gte: since30d } } }),
    prisma.transaction.groupBy({
      by: ["kind"],
      _count: { _all: true },
    }),
    prisma.transaction.count({ where: { status: "failed" } }),
    prisma.transaction.count({
      where: { kind: "receive", originChain: { not: null } },
    }),
    prisma.transaction.count({
      where: {
        kind: "receive",
        originChain: { not: null },
        createdAt: { gte: since7d },
      },
    }),
    prisma.transaction.groupBy({
      by: ["originChain"],
      where: { kind: "receive", originChain: { not: null } },
      _count: { _all: true },
    }),
    // Sum credit-side rows only so a send→receive pair counts once.
    prisma.$queryRaw<Array<{ token: string; total: number }>>`
      SELECT
        COALESCE(UPPER(metadata->>'token'), 'USDC') AS token,
        SUM(
          CAST(
            REGEXP_REPLACE("amountLabel", '[^0-9.]', '', 'g')
            AS NUMERIC
          )
        )::float AS total
      FROM "Transaction"
      WHERE "variant" = 'credit'
        AND "status" IS DISTINCT FROM 'failed'
      GROUP BY 1
    `,
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        kind: true,
        status: true,
        amountLabel: true,
        variant: true,
        chain: true,
        originChain: true,
        metadata: true,
        createdAt: true,
        user: { select: { username: true, displayName: true } },
      },
    }),
  ]);

  const byType: ByType = { send: 0, receive: 0, swap: 0, bridge: 0, bridgeIn: 0 };
  for (const row of byKindRows) {
    const k = row.kind;
    if (k === "send" || k === "receive" || k === "swap" || k === "bridge") {
      byType[k as keyof ByType] = row._count._all;
    }
  }
  // "bridgeIn" = Universal Receive sweeps (subset of "receive" with originChain).
  byType.bridgeIn = ursTotal;

  const bySource: BySource = {};
  for (const row of sweepsByChainRows) {
    const key = normaliseSource(row.originChain);
    if (key) bySource[key] = (bySource[key] ?? 0) + row._count._all;
  }

  const volumeByToken: VolumeByToken = { usdc: 0, eurc: 0 };
  for (const row of volumeRows) {
    const key = normaliseToken(row.token);
    if (!key) continue;
    const value = Number(row.total ?? 0);
    if (key === "cirbtc") {
      volumeByToken.cirbtc = (volumeByToken.cirbtc ?? 0) + value;
    } else {
      volumeByToken[key] = (volumeByToken[key] ?? 0) + value;
    }
  }

  const recent = recentRows.map((r) => {
    const amount = labelToNumber(r.amountLabel);
    const token = extractToken(r.metadata);
    return {
      id: r.id,
      createdAt: r.createdAt,
      type: r.originChain ? "bridgeIn" : r.kind,
      status: r.status ?? "complete",
      amount: amount.toFixed(2),
      token,
      handle: extractHandle(r.metadata, r.kind, r.user),
    };
  });

  return {
    users: {
      total: totalUsers,
      signupsLast7d,
      signupsLast30d,
      dauLast24h,
      wauLast7d,
    },
    wallets: { total: walletsTotal },
    transactions: {
      total: totalTransactions,
      last7d: txLast7d,
      last30d: txLast30d,
      byType,
      volumeByToken,
      failed: failedCount,
    },
    universalReceive: {
      total: ursTotal,
      last7d: ursLast7d,
      bySource,
      // Origin-chain timestamps are not persisted, so latency is unmeasurable.
      medianSweepSeconds: null,
    },
    recent,
  };
}
