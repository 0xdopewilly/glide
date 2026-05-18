"use client";

import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { FlowPage } from "@/components/flow-page";
import { useWallet } from "@/context/wallet-context";
import { ArrowDownUp, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const RATE = 0.92;

type Step = "form" | "success";

export default function SwapPage() {
  const router = useRouter();
  const { swapMoney, balance, error, clearError } = useWallet();
  const [fromAmount, setFromAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [localError, setLocalError] = useState<string | null>(null);

  const parsed = parseFloat(fromAmount) || 0;
  const toAmount = useMemo(() => {
    if (parsed <= 0) return "";
    return (parsed * RATE).toFixed(2);
  }, [parsed]);

  const overBalance = parsed > balance;
  const canSubmit = parsed > 0 && !overBalance && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setLocalError(null);
    clearError();
    const ok = await swapMoney(fromAmount);
    setSubmitting(false);
    if (ok) setStep("success");
    else setLocalError("Swap could not be completed.");
  };

  if (step === "success") {
    return (
      <FlowPage>
        <div className="flex flex-1 flex-col items-center px-6 pt-10 text-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full"
            style={{ background: "var(--glide-accent)" }}
          >
            <Check className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="mt-8 text-2xl font-bold tracking-tight">Swap complete</h1>
          <p className="mt-2 text-lg glide-muted">
            ${parsed.toFixed(2)} USDC to {toAmount} EURC
          </p>
          <GlideButton
            onClick={() => router.push("/activity")}
            className="mt-auto mb-8 max-w-sm"
            uppercase={false}
          >
            View activity
          </GlideButton>
        </div>
      </FlowPage>
    );
  }

  return (
    <FlowPage title="Swap" backHref="/">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col px-5 pb-8">
        <p className="mt-2 text-sm glide-muted">
          Swap on Arc testnet. Balance ${balance.toFixed(2)} USDC.
        </p>
        <FormField id="swap-from" label="From USDC" className="mt-6">
          <input
            id="swap-from"
            type="number"
            min="0"
            step="0.01"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            placeholder="0.00"
            className={inputClassName}
            required
          />
        </FormField>
        <div className="my-4 flex justify-center">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "var(--glide-surface-elevated)" }}
          >
            <ArrowDownUp className="h-5 w-5 glide-muted" />
          </span>
        </div>
        <FormField id="swap-to" label="To EURC">
          <input
            id="swap-to"
            readOnly
            value={toAmount}
            placeholder="0.00"
            className={`${inputClassName} opacity-90`}
          />
        </FormField>
        <div className="mt-4 flex justify-between rounded-xl border px-4 py-3 text-sm glide-surface-card">
          <span className="glide-muted">Rate</span>
          <span className="font-semibold tracking-tight">1 USDC = {RATE} EURC</span>
        </div>
        {overBalance ? (
          <p className="mt-3 text-sm text-red-400">Amount exceeds your balance</p>
        ) : null}
        {(localError || error) && (
          <p className="mt-3 text-sm text-red-400">{localError ?? error}</p>
        )}
        <GlideButton
          type="submit"
          disabled={!canSubmit}
          className="mt-8"
          uppercase={false}
        >
          {submitting ? "Processing" : "Confirm swap"}
        </GlideButton>
      </form>
    </FlowPage>
  );
}
