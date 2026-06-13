import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";

// Re-render at most every 5 minutes; partner viewers don't need real-time.
export const revalidate = 300;

const CHAIN_LABELS = ["Base", "Ethereum", "Polygon", "Arbitrum"] as const;
type ChainLabel = (typeof CHAIN_LABELS)[number];

type SweepRow = {
  originChain: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
  amountLabel: string;
};

type ArcStats = {
  totalUsers: number;
  totalSweeps: number;
  completedSweeps: number;
  sweepsByChain: Record<ChainLabel, number>;
  medianSweepSeconds: number | null;
  arcTransactions: number;
  usdcVolume: number;
  eurcVolume: number;
  generatedAt: string;
};

function parseAmount(label: string): number {
  // amountLabel is a display string like "+$12.50" or "−$0.00".
  // Strip everything but digits and dot, then parse.
  const n = parseFloat(label.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isCompletedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase();
  return s !== "pending" && s !== "failed" && s !== "error";
}

async function getArcStats(): Promise<ArcStats> {
  const [
    totalUsers,
    sweeps,
    arcTransactions,
    arcTxRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.transaction.findMany({
      where: { kind: "receive", originChain: { not: null } },
      select: {
        originChain: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        amountLabel: true,
      },
    }),
    prisma.transaction.count({
      where: {
        OR: [
          { chain: "arc-testnet" },
          { kind: { in: ["send", "swap"] } },
        ],
      },
    }),
    // For token volume split, we need metadata.token. Pull only the on-Arc rows.
    prisma.transaction.findMany({
      where: {
        kind: { in: ["send", "receive", "swap"] },
        status: { notIn: ["failed", "error"] },
      },
      select: { amountLabel: true, metadata: true, kind: true, circleTransactionId: true },
    }),
  ]);

  // Sweep aggregations
  const sweepsByChain: Record<ChainLabel, number> = {
    Base: 0,
    Ethereum: 0,
    Polygon: 0,
    Arbitrum: 0,
  };
  let completedSweeps = 0;
  const sweepDurationsMs: number[] = [];
  for (const s of sweeps as SweepRow[]) {
    const c = s.originChain as ChainLabel | null;
    if (c && c in sweepsByChain) sweepsByChain[c] += 1;
    if (isCompletedStatus(s.status)) {
      completedSweeps += 1;
      const dur = s.updatedAt.getTime() - s.createdAt.getTime();
      if (dur > 0 && dur < 1000 * 60 * 60) {
        // Cap at 1 hour to avoid background-job tail rewrites skewing the median.
        sweepDurationsMs.push(dur);
      }
    }
  }
  let medianSweepSeconds: number | null = null;
  if (sweepDurationsMs.length > 0) {
    sweepDurationsMs.sort((a, b) => a - b);
    const mid = Math.floor(sweepDurationsMs.length / 2);
    const ms =
      sweepDurationsMs.length % 2 === 0
        ? (sweepDurationsMs[mid - 1] + sweepDurationsMs[mid]) / 2
        : sweepDurationsMs[mid];
    medianSweepSeconds = Math.round(ms / 1000);
  }

  // Volume by token. One Circle transfer creates two rows (sender debit +
  // recipient credit); de-dupe on circleTransactionId so we don't double-count.
  const seen = new Set<string>();
  let usdcVolume = 0;
  let eurcVolume = 0;
  for (const r of arcTxRows) {
    if (r.circleTransactionId) {
      if (seen.has(r.circleTransactionId)) continue;
      seen.add(r.circleTransactionId);
    }
    const meta = (r.metadata ?? {}) as { token?: unknown };
    const token = typeof meta.token === "string" ? meta.token.toUpperCase() : "USDC";
    const amt = parseAmount(r.amountLabel);
    if (token === "EURC") eurcVolume += amt;
    else usdcVolume += amt;
  }

  return {
    totalUsers,
    totalSweeps: sweeps.length,
    completedSweeps,
    sweepsByChain,
    medianSweepSeconds,
    arcTransactions,
    usdcVolume,
    eurcVolume,
    generatedAt: new Date().toISOString(),
  };
}

function fmtInt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtMoney(n: number, symbol: string): string {
  return `${symbol}${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtSeconds(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default async function ArcPartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const expected = process.env.PARTNER_ARC_KEY?.trim();
  if (!expected || !key || key !== expected) {
    notFound();
  }

  const stats = await getArcStats();
  const totalSweeps = stats.totalSweeps;

  const chainEntries: Array<{ label: ChainLabel; count: number; pct: number }> =
    CHAIN_LABELS.map((label) => {
      const count = stats.sweepsByChain[label] ?? 0;
      const pct = totalSweeps > 0 ? (count / totalSweeps) * 100 : 0;
      return { label, count, pct };
    });

  const totalVolume = stats.usdcVolume + stats.eurcVolume;

  return (
    <main
      style={{
        backgroundColor: "#ffffff",
        color: "#0F172A",
        minHeight: "100vh",
        fontFamily:
          "var(--font-jakarta), var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "48px 24px 96px",
        }}
      >
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            paddingBottom: 32,
            borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Image
              src="/glidepay-wordmark.png"
              alt="glidepay"
              width={140}
              height={32}
              priority
              style={{ height: 28, width: "auto" }}
            />
            <span
              style={{
                fontSize: 14,
                color: "rgba(15, 23, 42, 0.6)",
                fontWeight: 500,
              }}
            >
              glidepay + Arc, weekly snapshot
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(15, 23, 42, 0.5)",
              fontWeight: 700,
            }}
          >
            Testnet
          </span>
        </header>

        {/* Hero stat — Universal Receive sweeps */}
        <section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(15, 23, 42, 0.55)",
              fontWeight: 700,
              margin: 0,
              marginBottom: 16,
            }}
          >
            Universal Receive sweeps to Arc
          </p>
          <div
            style={{
              fontSize: "clamp(72px, 14vw, 144px)",
              lineHeight: 0.95,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              color: "#0F172A",
            }}
          >
            {fmtInt(totalSweeps)}
          </div>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: "rgba(15, 23, 42, 0.65)",
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            Every sweep moves real USDC onto Arc from another chain — that&apos;s
            volume glidepay is actively driving to the network.
            {stats.completedSweeps > 0 && totalSweeps > 0 ? (
              <>
                {" "}
                {fmtInt(stats.completedSweeps)} settled
                {totalSweeps - stats.completedSweeps > 0
                  ? `, ${fmtInt(totalSweeps - stats.completedSweeps)} in flight or retrying`
                  : ""}
                .
              </>
            ) : null}
          </p>
        </section>

        {/* Source chain breakdown */}
        <section style={{ paddingBottom: 48 }}>
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(15, 23, 42, 0.55)",
              fontWeight: 700,
              margin: 0,
              marginBottom: 24,
            }}
          >
            Source chains
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {chainEntries.map(({ label, count, pct }) => (
              <div key={label}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0F172A",
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#0F172A",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {fmtInt(count)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(15, 23, 42, 0.5)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    width: "100%",
                    backgroundColor: "rgba(15, 23, 42, 0.06)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: "#0D9488",
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Secondary metric grid */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24,
            paddingBottom: 48,
          }}
        >
          <Stat
            label="Median sweep time"
            value={fmtSeconds(stats.medianSweepSeconds)}
            hint="Source-chain confirm → funds on Arc"
          />
          <Stat
            label="Transactions on Arc"
            value={fmtInt(stats.arcTransactions)}
            hint="Sends, receives, swaps"
          />
          <Stat
            label="Total users"
            value={fmtInt(stats.totalUsers)}
            hint="glidepay accounts"
          />
          <Stat
            label="USDC volume"
            value={fmtMoney(stats.usdcVolume, "$")}
            hint={`${((stats.usdcVolume / Math.max(totalVolume, 1)) * 100).toFixed(0)}% of total`}
          />
          <Stat
            label="EURC volume"
            value={fmtMoney(stats.eurcVolume, "€")}
            hint={`${((stats.eurcVolume / Math.max(totalVolume, 1)) * 100).toFixed(0)}% of total`}
          />
        </section>

        {/* Footer */}
        <footer
          style={{
            paddingTop: 24,
            borderTop: "1px solid rgba(15, 23, 42, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            fontSize: 12,
            color: "rgba(15, 23, 42, 0.55)",
            flexWrap: "wrap",
          }}
        >
          <span>
            Last updated {fmtTimestamp(stats.generatedAt)}. Page refreshes every 5 minutes.
          </span>
          <span
            style={{
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            glidepay × Arc
          </span>
        </footer>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        padding: "20px 0",
        borderTop: "1px solid rgba(15, 23, 42, 0.08)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(15, 23, 42, 0.55)",
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 40,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "#0F172A",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "rgba(15, 23, 42, 0.55)",
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
}

// `revalidate = 300` (top of file) is ISR — Next re-renders at most every 5
// minutes per unique searchParams combo. We also emit a Cache-Control hint
// via metadata so browser/CDN caches keep the rendered HTML fast.
export async function generateMetadata() {
  return {
    title: "glidepay × Arc — partner snapshot",
    description: "Live glidepay metrics for the Arc team.",
    robots: { index: false, follow: false },
    other: {
      "Cache-Control": "public, max-age=300",
    },
  };
}
