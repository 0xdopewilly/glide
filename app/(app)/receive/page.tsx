"use client";

import { CopyButton } from "@/components/copy-button";
import { copyText } from "@/lib/clipboard";
import { FlowPage } from "@/components/flow-page";
import { ReceiveQr } from "@/components/receive-qr";
import { UserAvatar } from "@/components/user-avatar";
import { useWallet } from "@/context/wallet-context";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";

type ReceiveAddress = {
  chain: string;
  label: string;
  circleBlockchain: string;
  walletId: string;
  address: string;
  usdcBalance?: number;
};

type ChainTab = {
  key: string;
  label: string;
  address: string;
  hint: string;
  usdcBalance?: number;
};

export default function ReceivePage() {
  const { wallet, loading, profile } = useWallet();
  const arcAddress = wallet?.address ?? "";

  const [extras, setExtras] = useState<ReceiveAddress[]>([]);
  const [selected, setSelected] = useState<string>("arc");
  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);

  const refreshAddresses = () => {
    if (!arcAddress) return Promise.resolve();
    return fetch("/api/receive-addresses")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { addresses?: ReceiveAddress[] } | null) => {
        if (json?.addresses) setExtras(json.addresses);
      })
      .catch(() => {});
  };

  useEffect(() => {
    let active = true;
    if (!arcAddress) return;
    void refreshAddresses().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcAddress]);

  const tabs: ChainTab[] = [
    {
      key: "arc",
      label: "Arc",
      address: arcAddress,
      hint: "USDC or EURC on Arc",
    },
    ...extras.map((e) => ({
      key: e.chain,
      label: e.label,
      address: e.address,
      hint: `USDC on ${e.label} — auto-bridges to Arc`,
      usdcBalance: e.usdcBalance,
    })),
  ];

  const active = tabs.find((t) => t.key === selected) ?? tabs[0];
  const address = active.address;
  const stuckBalance = active.key !== "arc" ? (active.usdcBalance ?? 0) : 0;

  const handleSweep = async () => {
    if (sweeping) return;
    setSweeping(true);
    setSweepMsg(null);
    try {
      const res = await fetch("/api/receive/sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chain: active.key }),
      });
      const json = (await res.json()) as {
        status?: string;
        amount?: string;
        detail?: string;
      };
      if (json.status === "swept") {
        setSweepMsg(`Bridged $${json.amount} to Arc.`);
      } else if (json.status === "nothing_to_sweep") {
        setSweepMsg("Nothing to sweep.");
      } else if (json.status === "in_progress") {
        setSweepMsg("Sweep already in progress.");
      } else {
        setSweepMsg(json.detail ?? "Sweep failed.");
      }
      await refreshAddresses();
    } catch {
      setSweepMsg("Sweep failed.");
    } finally {
      setSweeping(false);
    }
  };

  const share = async () => {
    if (!address) return;
    const text =
      active.key === "arc"
        ? `Pay me on glidepay: ${address}`
        : `Pay me USDC on ${active.label}: ${address}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "glidepay", text });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    await copyText(address);
  };

  return (
    <FlowPage title="Receive" backHref="/">
      <div className="slide-up-bouncy flex flex-col px-5 pb-8">
        <div className="mt-6 flex flex-col items-center text-center">
          <UserAvatar size="lg" />
          <p className="mt-4 text-[20px] font-semibold tracking-tight text-[var(--glide-text)]">
            {profile.displayName.trim() || "Guest"}
          </p>
          <p className="glide-label-mono mt-2 text-[11px] font-semibold text-[var(--glide-muted)]">
            {active.hint}
          </p>
        </div>

        {tabs.length > 1 ? (
          <div
            className="mx-auto mt-5 inline-flex rounded-full border p-1"
            style={{
              background: "var(--glide-surface-container)",
              borderColor: "var(--glide-border)",
            }}
          >
            {tabs.map((t) => {
              const isActive = t.key === active.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSelected(t.key)}
                  className="glide-tap glide-label-mono px-4 py-1.5 text-[11px] font-bold transition-colors"
                  style={{
                    borderRadius: 999,
                    background: isActive
                      ? "var(--glide-accent)"
                      : "transparent",
                    color: isActive
                      ? "var(--glide-bg)"
                      : "var(--glide-muted)",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        ) : null}

        <ReceiveQr address={address} />

        <div
          className="mt-6 rounded-2xl border px-4 py-5"
          style={{
            background: "var(--glide-surface-elevated)",
            borderColor: "var(--glide-border)",
          }}
        >
          <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
            Your {active.label} address
          </p>
          <p className="mt-3 break-all font-mono text-sm leading-relaxed text-[var(--glide-text)]">
            {loading && !address
              ? "Loading your account"
              : address || "Account not ready"}
          </p>
          {active.key !== "arc" ? (
            <p className="glide-label-mono mt-3 text-[10px] font-semibold leading-relaxed text-[var(--glide-muted)]">
              USDC sent here lands on Arc automatically via CCTP — usually
              within a minute.
            </p>
          ) : null}
        </div>

        {active.key !== "arc" ? (
          <div
            className="mt-3 rounded-2xl border px-4 py-4"
            style={{
              background: "var(--glide-surface-elevated)",
              borderColor: "var(--glide-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
                  Stuck on {active.label}
                </p>
                <p className="mt-1 text-[18px] font-bold tabular-nums tracking-tight text-[var(--glide-text)]">
                  ${stuckBalance.toFixed(2)} USDC
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSweep()}
                disabled={sweeping || stuckBalance <= 0}
                className="glide-tap glide-label-mono rounded-full px-4 py-2 text-[11px] font-bold transition-opacity disabled:opacity-40"
                style={{
                  background: "var(--glide-accent)",
                  color: "var(--glide-bg)",
                }}
              >
                {sweeping ? "Sweeping…" : "Sweep to Arc"}
              </button>
            </div>
            {sweepMsg ? (
              <p
                className="glide-label-mono mt-3 text-[10px] font-semibold"
                style={{ color: "var(--glide-muted)" }}
              >
                {sweepMsg}
              </p>
            ) : null}
          </div>
        ) : null}

        <CopyButton value={address} label="Copy address" className="mt-4 w-full" />

        <button
          type="button"
          onClick={() => void share()}
          disabled={!address}
          className="glide-tap glide-label-mono mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-[11px] font-semibold transition-opacity disabled:opacity-40"
          style={{
            background: "var(--glide-accent)",
            color: "var(--glide-bg)",
            borderColor: "var(--glide-accent)",
          }}
        >
          <Share2 className="h-4 w-4" />
          Share address
        </button>
      </div>
    </FlowPage>
  );
}
