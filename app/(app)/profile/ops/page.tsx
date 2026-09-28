"use client";

import { PageHeader } from "@/components/page-header";
import { SettingsIcon } from "@/components/settings-list";
import type { OpsChain } from "@/app/api/admin/ops/route";
import { copyText } from "@/lib/clipboard";
import { Check, Copy, Fuel, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type OpsResponse = {
  isAdmin: boolean;
  userId: string;
  network?: string;
  chains?: OpsChain[];
};

/** Operator-only: the gas wallets behind Universal Receive. A chain goes live
 * on its own once its gas wallet holds enough gas (lib/gas-refill.ts). */
export default function OpsPage() {
  const [data, setData] = useState<OpsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  // State changes only after the request settles (never synchronously in
  // the effect).
  const fetchOps = useCallback(
    () =>
      fetch("/api/admin/ops", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error();
          return res.json() as Promise<OpsResponse>;
        })
        .then((json) => {
          setData(json);
          setError(null);
        })
        .catch(() => setError("Couldn't load. Try again."))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void fetchOps();
  }, [fetchOps]);

  const load = async () => {
    setLoading(true);
    await fetchOps();
  };

  const create = async (chain: string) => {
    setCreating(chain);
    setError(null);
    try {
      const res = await fetch("/api/admin/gas-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Couldn't create the gas wallet.");
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(null);
    }
  };

  return (
    <>
      <PageHeader title="Operations" backHref="/profile" />
      <div className="glide-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(2rem,var(--glide-safe-bottom))]">
        {data && !data.isAdmin ? (
          <div className="glide-surface-card mt-4 rounded-2xl px-4 py-4">
            <p className="text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
              For the glidepay operator
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--glide-muted)]">
              This account isn&apos;t the operator. To make it the operator, set
              GLIDE_ADMIN_USER_ID to this account id:
            </p>
            <CopyField value={data.userId} />
          </div>
        ) : null}

        {data?.isAdmin ? (
          <>
            <div className="mt-4 flex items-start gap-3 px-1">
              <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-[var(--glide-muted)]">
                Receiving from other chains. Each chain goes live on its own once
                its gas wallet holds enough gas, and goes offline again if it runs
                low. glidepay spends this gas to move deposits on that chain to Arc.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                aria-label="Refresh"
                className="glide-tap flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
                style={{ background: "var(--glide-surface-container-high)", color: "var(--glide-text)" }}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} strokeWidth={2.25} />
              </button>
            </div>
            {data.chains?.map((c) => (
              <ChainCard
                key={c.key}
                chain={c}
                creating={creating === c.status?.circleBlockchain}
                onCreate={create}
              />
            ))}
          </>
        ) : null}

        {!data && loading ? (
          <div className="glide-surface-card mt-4 h-40 animate-pulse rounded-2xl" aria-hidden />
        ) : null}

        {error ? (
          <p className="mt-4 px-1 text-[13px] font-medium" style={{ color: "var(--glide-error)" }}>
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}

function ChainCard({
  chain,
  creating,
  onCreate,
}: {
  chain: OpsChain;
  creating: boolean;
  onCreate: (circleBlockchain: string) => void;
}) {
  const s = chain.status;
  const state = !s ? "error" : s.ready ? "live" : s.address ? "needs-gas" : "not-set-up";
  const pill = {
    live: { label: "Live", bg: "var(--glide-success-container)", fg: "var(--glide-success)" },
    "needs-gas": { label: "Needs gas", bg: "color-mix(in srgb, #F5A524 16%, transparent)", fg: "#F5A524" },
    "not-set-up": { label: "Not set up", bg: "var(--glide-surface-container-high)", fg: "var(--glide-muted)" },
    error: { label: "Unavailable", bg: "color-mix(in srgb, var(--glide-error) 14%, transparent)", fg: "var(--glide-error)" },
  }[state];

  return (
    <section className="glide-surface-card mt-4 rounded-2xl px-4 py-4">
      <div className="flex items-center gap-3">
        <SettingsIcon icon={Fuel} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold tracking-tight text-[var(--glide-text)]">
            {chain.label}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[var(--glide-muted)]">
            Deposits from ${chain.minSweepUsd} bridge to Arc
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
          style={{ background: pill.bg, color: pill.fg }}
        >
          {pill.label}
        </span>
      </div>

      {chain.error ? (
        <p className="mt-3 text-[13px] text-[var(--glide-muted)]">{chain.error}</p>
      ) : null}

      {s && !s.address ? (
        <button
          type="button"
          onClick={() => onCreate(s.circleBlockchain)}
          disabled={creating}
          className="glide-tap mt-4 w-full rounded-full py-3 text-[14px] font-semibold disabled:opacity-60"
          style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
        >
          {creating ? "Creating…" : "Create gas wallet"}
        </button>
      ) : null}

      {s?.address ? (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
            <Stat label="Balance" value={s.balance === null ? "—" : `${trim(s.balance)} ${s.symbol}`} />
            <Stat label="Live at" value={`${trim(s.readyAt)} ${s.symbol}`} />
            <Stat label="Suggested" value={`${trim(s.suggested)} ${s.symbol}`} />
          </dl>
          {!s.ready ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--glide-muted)]">
              Send {s.symbol} on the {chain.label} network to this address. About{" "}
              {trim(s.suggested)} {s.symbol} covers the first deposits of roughly ten
              people ({s.refill} {s.symbol} each).
            </p>
          ) : null}
          <CopyField value={s.address} />
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-2.5 py-2" style={{ background: "var(--glide-surface-container-high)" }}>
      <dt className="text-[var(--glide-muted)]">{label}</dt>
      <dd className="mt-0.5 truncate font-semibold tabular-nums text-[var(--glide-text)]">{value}</dd>
    </div>
  );
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }
      }}
      className="glide-tap mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left"
      style={{ background: "var(--glide-surface-container-high)" }}
    >
      <span className="min-w-0 flex-1 break-all font-mono text-[12px] text-[var(--glide-text)]">
        {value}
      </span>
      {copied ? (
        <Check className="h-4 w-4 shrink-0" style={{ color: "var(--glide-success)" }} aria-label="Copied" />
      ) : (
        <Copy className="h-4 w-4 shrink-0 text-[var(--glide-muted)]" aria-label="Copy" />
      )}
    </button>
  );
}

/** "0.005000000000000000" → "0.005"; keeps up to 6 decimals. */
function trim(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}
