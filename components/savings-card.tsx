"use client";

import { useAppAuth } from "@/context/auth-context";
import { haptics } from "@/lib/haptics";
import { readUiCache, writeUiCache } from "@/lib/ui-cache";
import { useCallback, useEffect, useState } from "react";

type Summary = { address: string | null; usdc: number; eurc: number };

const CACHE_KEY = "savings";
const CACHE_MAX_AGE_MS = 1000 * 60 * 30;

/** Branded Savings balance card with an inline "Move to Spending" withdraw.
 * Shared by the home screen and the Automations dashboard. Seeds from a
 * user-scoped cache so it paints instantly on repeat visits (no pop-in), and
 * keeps showing the last-known balance if a refresh fails rather than hiding
 * the user's savings behind a transient error. Renders nothing only when the
 * user genuinely has no Savings wallet. */
export function SavingsCard({
  className = "",
  onChange,
}: {
  className?: string;
  onChange?: () => void;
}) {
  const { user } = useAppAuth();
  const userId = user?.id ?? null;

  const [savings, setSavings] = useState<Summary | null>(() =>
    readUiCache<Summary>(CACHE_KEY, userId, CACHE_MAX_AGE_MS),
  );
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/savings");
      if (!res.ok) return; // keep last-known values; don't blank the card
      const data = (await res.json().catch(() => null)) as Summary | null;
      if (!data) return;
      const next: Summary = {
        address: data.address ?? null,
        usdc: data.usdc ?? 0,
        eurc: data.eurc ?? 0,
      };
      setSavings(next);
      writeUiCache(CACHE_KEY, userId, next);
    } catch {
      // Network error — keep whatever we already have rather than hiding the
      // user's savings behind a transient failure.
    }
  }, [userId]);

  useEffect(() => {
    const cached = readUiCache<Summary>(CACHE_KEY, userId, CACHE_MAX_AGE_MS);
    if (cached) setSavings((prev) => prev ?? cached);
    void load();
  }, [userId, load]);

  const available = savings?.usdc ?? 0;

  const withdraw = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than 0.");
      haptics.error();
      return;
    }
    if (value > available + 1e-9) {
      setError("That's more than your savings balance.");
      haptics.error();
      return;
    }
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
        haptics.error();
        return;
      }
      haptics.success();
      setOpen(false);
      setAmount("");
      await load();
      onChange?.();
    } catch {
      setError("Network error. Check your connection and try again.");
      haptics.error();
    } finally {
      setBusy(false);
    }
  };

  if (!savings?.address) return null;

  const usd = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`glide-surface-card shrink-0 overflow-hidden rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--glide-muted)]">Savings</p>
          <p className="mt-0.5 text-[24px] font-bold tabular-nums tracking-tight text-[var(--glide-text)]">
            ${usd(available)}
          </p>
          {savings.eurc > 0 ? (
            <p className="text-[12px] font-medium text-[var(--glide-muted)]">
              + €{usd(savings.eurc)} EURC
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          aria-expanded={open}
          className="glide-tap shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold text-[var(--glide-text)]"
          style={{
            background: "var(--glide-surface-container-high)",
            border: "1px solid var(--glide-border)",
          }}
        >
          Withdraw
        </button>
      </div>
      {open ? (
        <div
          className="mt-4 rounded-xl p-3"
          style={{ background: "var(--glide-input)", border: "1px solid var(--glide-border)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[var(--glide-muted)]">$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              aria-label="Amount to withdraw"
              className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[var(--glide-text)] outline-none placeholder:text-[var(--glide-muted)]"
            />
            <button
              type="button"
              onClick={() => setAmount(String(available))}
              className="rounded-full px-2.5 py-1 text-[12px] font-semibold text-[var(--glide-text)]"
              style={{ background: "var(--glide-surface-container-high)" }}
            >
              Max
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-[12px] font-semibold" style={{ color: "var(--glide-error)" }}>
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void withdraw()}
            disabled={busy || !amount.trim()}
            className="glide-tap mt-3 w-full rounded-full py-2.5 text-[14px] font-semibold disabled:opacity-50"
            style={{ background: "var(--glide-primary)", color: "var(--glide-on-primary)" }}
          >
            {busy ? "Moving…" : "Move to Spending"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
