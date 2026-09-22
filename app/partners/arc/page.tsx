import { notFound } from "next/navigation";
import Image from "next/image";
import { getSweepStats, getTransferStats, getUserStats } from "@/lib/metrics";
import { IS_MAINNET, type ExternalChainKey } from "@/lib/network";

// Re-render at most every 5 minutes; partner viewers don't need real-time.
export const revalidate = 300;

const CHAIN_LABELS = ["Base", "Ethereum", "Polygon", "Arbitrum"] as const;
type ChainLabel = (typeof CHAIN_LABELS)[number];

type ArcStats = {
  totalUsers: number;
  activeUsers30d: number;
  settledSweeps: number;
  failedSweeps: number;
  inFlightSweeps: number;
  sweepsByChain: Record<ChainLabel, number>;
  medianSweepSeconds: number | null;
  arcTransactions: number;
  usdcVolume: number;
  eurcVolume: number;
  generatedAt: string;
};

const CHAIN_KEY: Record<ChainLabel, ExternalChainKey> = {
  Base: "base",
  Ethereum: "ethereum",
  Polygon: "polygon",
  Arbitrum: "arbitrum",
};

/** Same definitions as /api/public/stats and /admin (lib/metrics.ts). */
async function getArcStats(): Promise<ArcStats> {
  const [users, transfers, sweeps] = await Promise.all([
    getUserStats(),
    getTransferStats(),
    getSweepStats(),
  ]);

  const sweepsByChain = {} as Record<ChainLabel, number>;
  for (const label of CHAIN_LABELS) {
    sweepsByChain[label] = sweeps.settledBySource[CHAIN_KEY[label]];
  }

  return {
    totalUsers: users.total,
    activeUsers30d: users.activeLast30d,
    settledSweeps: sweeps.settled,
    failedSweeps: sweeps.failed,
    inFlightSweeps: sweeps.inFlight,
    sweepsByChain,
    medianSweepSeconds: sweeps.medianSeconds,
    arcTransactions: transfers.count,
    usdcVolume: transfers.volumeByToken.USDC ?? 0,
    eurcVolume: transfers.volumeByToken.EURC ?? 0,
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
  const totalSweeps = stats.settledSweeps;

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
        backgroundColor: "#DCFCE7",
        color: "#0A0A0A",
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
            borderBottom: "1px solid rgba(34, 197, 94, 0.18)",
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
              color: "rgba(10, 10, 10, 0.5)",
              fontWeight: 700,
            }}
          >
            {IS_MAINNET ? "Mainnet" : "Testnet"}
          </span>
        </header>

        {/* Hero stat — Universal Receive sweeps */}
        <section style={{ paddingTop: 48, paddingBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(10, 10, 10, 0.55)",
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
              color: "#0A0A0A",
            }}
          >
            {fmtInt(totalSweeps)}
          </div>
          <p
            style={{
              marginTop: 16,
              fontSize: 16,
              color: "rgba(10, 10, 10, 0.65)",
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            Settled sweeps only — each one moved USDC onto Arc from another
            chain, volume glidepay is actively driving to the network.
            {stats.inFlightSweeps > 0 ? ` ${fmtInt(stats.inFlightSweeps)} in flight.` : ""}
            {stats.failedSweeps > 0 ? ` ${fmtInt(stats.failedSweeps)} failed.` : ""}
          </p>
        </section>

        {/* Source chain breakdown */}
        <section style={{ paddingBottom: 48 }}>
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(10, 10, 10, 0.55)",
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
                      color: "#0A0A0A",
                    }}
                  >
                    {label}
                  </span>
                  <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#0A0A0A",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {fmtInt(count)}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: "rgba(10, 10, 10, 0.5)",
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
                      backgroundColor: "#4ADE80",
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
            label="Payments on Arc"
            value={fmtInt(stats.arcTransactions)}
            hint="Distinct transfers, each counted once"
          />
          <Stat
            label="Total users"
            value={fmtInt(stats.totalUsers)}
            hint={`${fmtInt(stats.activeUsers30d)} active in the last 30 days`}
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
            borderTop: "1px solid rgba(34, 197, 94, 0.18)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            fontSize: 12,
            color: "rgba(10, 10, 10, 0.55)",
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
        borderTop: "1px solid rgba(34, 197, 94, 0.18)",
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(10, 10, 10, 0.55)",
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
          color: "#0A0A0A",
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
            color: "rgba(10, 10, 10, 0.55)",
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
