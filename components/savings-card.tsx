"use client";

import { useEffect, useState } from "react";

type Summary = { address: string | null; usdc: number; eurc: number };

/** Branded Savings balance card with an inline "Move to Spending" withdraw.
 * Shared by the home screen and the Automations dashboard. Renders nothing
 * until the user actually has a Savings wallet. */
export function SavingsCard({
  className = "",
  onChange,
}: {
  className?: string;
  onChange?: () => void;
}) {
  const [savings, setSavings] = useState<Summary | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/savings");
      const data = (await res.json().catch(() => ({}))) as Summary;
      setSavings({
        address: data.address ?? null,
        usdc: data.usdc ?? 0,
        eurc: data.eurc ?? 0,
      });
    } catch {
      setSavings({ address: null, usdc: 0, eurc: 0 });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const withdraw = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/savings/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, token: "USDC" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Withdrawal failed.");
        return;
      }
      setOpen(false);
      setAmount("");
      await load();
      onChange?.();
    } finally {
      setBusy(false);
    }
  };

  if (!savings?.address) return null;

  return (
    <div
      className={`shrink-0 overflow-hidden rounded-3xl border p-5 ${className}`}
      style={{
        background:
          "linear-gradient(150deg, #7C5CFF 0%, #5B3DF5 55%, #4A2EE0 100%)",
        borderColor: "transparent",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white/75">
            Savings · auto-growing ↑
          </p>
          <p className="mt-0.5 text-[28px] font-bold tabular-nums text-white">
            ${savings.usdc.toFixed(2)}
          </p>
          {savings.eurc > 0 ? (
            <p className="text-[12px] font-medium text-white/70">
              + €{savings.eurc.toFixed(2)} EURC
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="glide-tap shrink-0 rounded-full bg-white/15 px-4 py-2 text-[13px] font-bold text-white"
        >
          Move to Spending
        </button>
      </div>
      {open ? (
        <div className="mt-4 rounded-2xl bg-white/10 p-3">
          <div className="flex items-center gap-2">
            <span className="text-white/80">$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-white outline-none placeholder:text-white/50"
            />
            <button
              type="button"
              onClick={() => setAmount(String(savings?.usdc ?? 0))}
              className="glide-label-mono rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white"
            >
              MAX
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[12px] font-semibold text-red-200">{error}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy || !amount.trim()}
            className="glide-tap mt-3 w-full rounded-full bg-white py-2.5 text-[13px] font-bold disabled:opacity-50"
            style={{ color: "var(--glide-primary)" }}
          >
            {busy ? "Moving…" : "Withdraw to Spending"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
