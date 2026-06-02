import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getAdminStats } from "@/lib/admin-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const raw =
    process.env.ADMIN_USER_IDS ??
    process.env.GLIDE_ADMIN_USER_IDS ??
    process.env.GLIDE_ADMIN_USER_ID ??
    "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.includes(userId);
}

const numberFmt = new Intl.NumberFormat("en-US");
const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const eurFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const SOURCE_META: Record<
  string,
  { label: string; color: string }
> = {
  base: { label: "Base", color: "#0052ff" },
  ethereum: { label: "Ethereum", color: "#627eea" },
  polygon: { label: "Polygon", color: "#8247e5" },
  arbitrum: { label: "Arbitrum", color: "#28a0f0" },
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </h2>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "complete"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "failed"
        ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {status}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
      {type}
    </span>
  );
}

export default async function AdminDashboardPage() {
  const { userId } = await auth();
  if (!isAdmin(userId)) notFound();

  const me = await currentUser();
  const adminEmail =
    me?.primaryEmailAddress?.emailAddress ??
    me?.emailAddresses?.[0]?.emailAddress ??
    "unknown";

  const stats = await getAdminStats();

  const totalVolumeUsdc = stats.transactions.volumeByToken.usdc ?? 0;
  const totalVolumeEurc = stats.transactions.volumeByToken.eurc ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">
              glidepay admin
            </h1>
            <span className="text-xs text-slate-500">
              signed in as <span className="font-medium">{adminEmail}</span>
            </span>
          </div>
          <a
            href="/partners/arc?key=<paste-key-here>"
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
          >
            view as Arc partner
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Hero stats */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total users"
            value={numberFmt.format(stats.users.total)}
            hint={`${numberFmt.format(stats.wallets.total)} with wallet`}
          />
          <StatCard
            label="Total transactions"
            value={numberFmt.format(stats.transactions.total)}
            hint={`${numberFmt.format(stats.transactions.last7d)} in last 7d`}
          />
          <StatCard
            label="Total volume (USDC)"
            value={currencyFmt.format(totalVolumeUsdc)}
            hint={
              totalVolumeEurc > 0
                ? `${eurFmt.format(totalVolumeEurc)} EURC`
                : undefined
            }
          />
          <StatCard
            label="Universal Receive sweeps"
            value={numberFmt.format(stats.universalReceive.total)}
            hint={`${numberFmt.format(stats.universalReceive.last7d)} in last 7d`}
          />
        </section>

        {/* Signup trend */}
        <section className="space-y-3">
          <SectionTitle>Signups</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Last 7 days"
              value={numberFmt.format(stats.users.signupsLast7d)}
            />
            <StatCard
              label="Last 30 days"
              value={numberFmt.format(stats.users.signupsLast30d)}
            />
            <StatCard
              label="DAU (24h)"
              value={numberFmt.format(stats.users.dauLast24h)}
            />
            <StatCard
              label="WAU (7d)"
              value={numberFmt.format(stats.users.wauLast7d)}
            />
          </div>
        </section>

        {/* Transactions by type */}
        <section className="space-y-3">
          <SectionTitle>Transactions by type</SectionTitle>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <StatCard
              label="Send"
              value={numberFmt.format(stats.transactions.byType.send)}
            />
            <StatCard
              label="Receive"
              value={numberFmt.format(stats.transactions.byType.receive)}
            />
            <StatCard
              label="Swap"
              value={numberFmt.format(stats.transactions.byType.swap)}
            />
            <StatCard
              label="Bridge"
              value={numberFmt.format(stats.transactions.byType.bridge)}
            />
            <StatCard
              label="Bridge in (UR)"
              value={numberFmt.format(stats.transactions.byType.bridgeIn)}
              hint={`${numberFmt.format(stats.transactions.failed)} failed total`}
            />
          </div>
        </section>

        {/* Universal Receive by source chain */}
        <section className="space-y-3">
          <SectionTitle>Universal Receive — by source chain</SectionTitle>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {Object.keys(stats.universalReceive.bySource).length === 0 ? (
              <p className="text-sm text-slate-500">No sweeps recorded yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {(
                  ["base", "ethereum", "polygon", "arbitrum"] as const
                ).map((key) => {
                  const count = stats.universalReceive.bySource[key];
                  if (!count) return null;
                  const meta = SOURCE_META[key];
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="inline-block size-3 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="text-sm font-medium text-slate-800">
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-slate-900">
                        {numberFmt.format(count)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {stats.universalReceive.medianSweepSeconds !== null ? (
              <p className="mt-4 text-xs text-slate-500">
                Median sweep time:{" "}
                {numberFmt.format(stats.universalReceive.medianSweepSeconds)}s
              </p>
            ) : null}
          </div>
        </section>

        {/* Recent activity */}
        <section className="space-y-3">
          <SectionTitle>Recent activity (last 50)</SectionTitle>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      Time
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      Type
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      User
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium text-slate-500">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      Token
                    </th>
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recent.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    stats.recent.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                          {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="px-4 py-2.5">
                          <TypePill type={row.type} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {row.handle ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-right font-medium tabular-nums text-slate-900">
                          {row.amount}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {row.token}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="pb-4 pt-4 text-center text-xs text-slate-400">
          glidepay admin · Arc testnet
        </footer>
      </div>
    </main>
  );
}
