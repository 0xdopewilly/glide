"use client";

import { CopyButton } from "@/components/copy-button";
import { copyText } from "@/lib/clipboard";
import { FlowPage } from "@/components/flow-page";
import { ReceiveQr } from "@/components/receive-qr";
import { UserAvatar } from "@/components/user-avatar";
import { useWallet } from "@/context/wallet-context";
import { Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
  pending?: boolean;
};

const STATIC_EXTRA_TABS: { key: string; label: string }[] = [
  { key: "base", label: "Base" },
  { key: "ethereum", label: "Ethereum" },
  { key: "polygon", label: "Polygon" },
  { key: "arbitrum", label: "Arbitrum" },
];

const CACHE_KEY = "glide:receive-addresses";

function readCachedExtras(): ReceiveAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ReceiveAddress[];
  } catch {
    return [];
  }
}

function writeCachedExtras(addresses: ReceiveAddress[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(addresses));
  } catch {
    // quota / privacy mode — ignore
  }
}

export default function ReceivePage() {
  const { wallet, profile } = useWallet();
  const arcAddress = wallet?.address ?? "";

  const [extras, setExtras] = useState<ReceiveAddress[]>(() => readCachedExtras());
  const [selected, setSelected] = useState<string>("arc");
  const [sweeping, setSweeping] = useState(false);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);

  const refreshAddresses = () => {
    if (!arcAddress) return Promise.resolve();
    return fetch("/api/receive-addresses")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { addresses?: ReceiveAddress[] } | null) => {
        if (json?.addresses) {
          setExtras(json.addresses);
          writeCachedExtras(json.addresses);
        }
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

  // Tabs render IMMEDIATELY from static config + cache. The address is filled
  // in once /api/receive-addresses resolves — until then the address shows a
  // skeleton instead of blocking the whole panel.
  const tabs: ChainTab[] = useMemo(() => {
    const extraByKey = new Map(extras.map((e) => [e.chain, e]));
    return [
      {
        key: "arc",
        label: "Arc",
        address: arcAddress,
        hint: "USDC or EURC on Arc",
      },
      ...STATIC_EXTRA_TABS.map((s) => {
        const hit = extraByKey.get(s.key);
        return {
          key: s.key,
          label: s.label,
          address: hit?.address ?? "",
          hint: `USDC on ${s.label} — auto-bridges to Arc`,
          usdcBalance: hit?.usdcBalance,
          pending: !hit,
        };
      }),
    ];
  }, [arcAddress, extras]);

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
                  className="glide-tap glide-label-mono px-4 py-1.5 text-[11px] font-bold"
                  style={{
                    borderRadius: 999,
                    background: isActive
                      ? "var(--glide-accent)"
                      : "transparent",
                    color: isActive
                      ? "var(--glide-bg)"
                      : "var(--glide-muted)",
                    transition:
                      "background-color 180ms var(--glide-ease-out), color 180ms var(--glide-ease-out)",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Cross-fade the QR + address panel when switching tabs. Keyed by
            active.key + address so the swap is visible after provisioning. */}
        <div
          key={`${active.key}-${address}`}
          className="glide-fade-in flex flex-col"
        >
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
            {address ? (
              <p className="mt-3 break-all font-mono text-sm leading-relaxed text-[var(--glide-text)]">
                {address}
              </p>
            ) : (
              <div className="mt-3 space-y-1.5" aria-hidden>
                <div
                  className="h-3 w-full animate-pulse rounded"
                  style={{ background: "var(--glide-surface-container-high)" }}
                />
                <div
                  className="h-3 w-2/3 animate-pulse rounded"
                  style={{ background: "var(--glide-surface-container-high)" }}
                />
              </div>
            )}
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

          <CopyButton
            value={address}
            label="Copy address"
            className="mt-4 w-full"
          />

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
      </div>
    </FlowPage>
  );
}
