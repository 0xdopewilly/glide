"use client";

import { FormField, inputClassName } from "@/components/form-field";
import { GlideButton } from "@/components/glide-button";
import { GlidePillButton } from "@/components/glide-pill-button";
import { FlowPage } from "@/components/flow-page";
import { FlowStepMotion } from "@/components/flow-step-motion";
import { KitSetupBanner, useCircleReady } from "@/components/kit-setup-banner";
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

  const parsed = parseFloat(fromAmount) || 0;
  const toAmount = useMemo(() => {
    if (parsed <= 0) return "";
    return (parsed * RATE).toFixed(2);
  }, [parsed]);

  const { ready: circleReady } = useCircleReady("swap");
  const overBalance = parsed > balance;
  const canSubmit = parsed > 0 && !overBalance && !submitting && circleReady;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    clearError();
    const ok = await swapMoney(fromAmount);
    setSubmitting(false);
    if (ok) setStep("success");
  };

  return (
    <FlowPage title={step === "form" ? "Swap" : undefined} backHref="/">
      <FlowStepMotion stepKey={step}>
        {step === "success" ? (
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
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col pb-8">
            <KitSetupBanner mode="swap" />
            <div className="flex flex-col px-5">
              <FormField id="swap-from" label="From USDC" className="mt-2">
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
              {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
              <GlidePillButton
                type="submit"
                disabled={!canSubmit}
                className="mt-8 w-full justify-center py-3.5"
              >
                {submitting ? "Processing" : "Confirm swap"}
              </GlidePillButton>
            </div>
          </form>
        )}
      </FlowStepMotion>
    </FlowPage>
  );
}
