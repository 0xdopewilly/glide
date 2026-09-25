"use client";

import { BottomSheet } from "@/components/bottom-sheet";
import { SettingsRow } from "@/components/settings-list";
import { usePrivacy } from "@/context/privacy-context";
import { PiggyBank, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

type Savings = { address: string | null; usdc: number; eurc: number };

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const EUR = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

/** Home "Accounts" pill: the spending (Main) and Savings balances. */
export function AccountsSheet({
  mainUsd,
  onClose,
}: {
  mainUsd: number;
  onClose: () => void;
}) {
  const { hideBalance } = usePrivacy();
  const [savings, setSavings] = useState<Savings | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/savings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Savings | null) => {
        if (!cancelled && d) setSavings(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const mask = (s: string) => (hideBalance ? "••••" : s);
  const savingsValue = !savings
    ? "…"
    : mask(
        savings.eurc > 0
          ? `${USD.format(savings.usdc)} + ${EUR.format(savings.eurc)}`
          : USD.format(savings.usdc),
      );

  return (
    <BottomSheet title="Accounts" onClose={onClose}>
      <SettingsRow
        icon={Wallet}
        title="Main"
        subtitle="Spending · USD"
        value={mask(USD.format(Number.isFinite(mainUsd) ? mainUsd : 0))}
      />
      <SettingsRow
        icon={PiggyBank}
        title="Savings"
        subtitle={savings?.address ? "Grows with your auto-save rules" : "Start one in Automate"}
        value={savingsValue}
        href="/automations"
      />
      <p className="px-5 pb-2 pt-3 text-[12.5px] leading-relaxed text-[var(--glide-muted)]">
        Your money is held on Arc as USDC, EURC and cirBTC.
      </p>
    </BottomSheet>
  );
}
