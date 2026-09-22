// Server-only stats aggregator for the admin dashboard.
//
// Notes on the underlying schema (see prisma/schema.prisma):
//   - Token (USDC / EURC / etc.) lives in `Transaction.metadata.token`, NOT
//     a column. We compute volume with a raw SQL query against the JSON column.
//   - `Transaction.amountLabel` is a display string (e.g. "+$12.50"). We strip
//     non-numeric chars to derive the magnitude.
//   - One Circle transfer creates TWO rows (debit on sender + credit on
//     recipient). Volume and sweep counts come from lib/metrics.ts, which
//     counts each transfer once — shared with /api/public/stats and the
//     partner page.
//   - Universal Receive sweeps are `kind="receive"` rows with `originChain`
//     populated (e.g. "Base", "Ethereum"). No separate table exists.
//
// The Prisma client lives in `lib/db.ts` in this repo (no `lib/prisma.ts`).
import { prisma } from "@/lib/db";
import { getSweepStats, getTransferStats } from "@/lib/metrics";

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
    transfers,
    sweeps,
    sweeps7d,
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
    // Volume + Universal Receive use the shared definitions (lib/metrics.ts)
    // so admin, /api/public/stats and the partner page always agree.
    getTransferStats(),
    getSweepStats(),
    getSweepStats(since7d),
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
  // "bridgeIn" = settled Universal Receive sweeps.
  byType.bridgeIn = sweeps.settled;

  const bySource: BySource = { ...sweeps.settledBySource };

  const volumeByToken: VolumeByToken = {
    usdc: transfers.volumeByToken.USDC ?? 0,
    eurc: transfers.volumeByToken.EURC ?? 0,
    ...(transfers.volumeByToken.cirBTC
      ? { cirbtc: transfers.volumeByToken.cirBTC }
      : {}),
  };

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
      total: sweeps.settled,
      last7d: sweeps7d.settled,
      bySource,
      medianSweepSeconds: sweeps.medianSeconds,
    },
    recent,
  };
}
