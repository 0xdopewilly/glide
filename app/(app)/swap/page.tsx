"use client";

import { FlowPage } from "@/components/flow-page";
import { FlowProcessingOverlay } from "@/components/flow-processing-overlay";
import { FlowStepMotion } from "@/components/flow-step-motion";
import { GlideButton } from "@/components/glide-button";
import { GlidePillButton } from "@/components/glide-pill-button";
import { KitSetupBanner, useCircleReady } from "@/components/kit-setup-banner";
import { TokenIcon } from "@/components/token-icon";
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
    const result = await swapMoney(fromAmount);
    setSubmitting(false);
    if (result.ok) setStep("success");
  };

  const useMax = () => {
    if (balance > 0) setFromAmount(balance.toFixed(2));
  };

  return (
    <FlowPage title={step === "form" ? "Swap" : undefined} backHref="/">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <FlowProcessingOverlay open={submitting} mode="swap" />
        <FlowStepMotion stepKey={step}>
          {step === "success" ? (
            <div className="slide-up-bouncy flex flex-1 flex-col items-center px-6 pt-10 text-center">
              <div
                className="glide-pop flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: "var(--glide-accent)" }}
              >
                <Check
                  className="h-12 w-12"
                  strokeWidth={2.5}
                  style={{ color: "var(--glide-bg)" }}
                />
              </div>
              <h1 className="glide-label-mono mt-8 text-[13px] font-bold text-[var(--glide-muted)]">
                Swap complete
              </h1>
              <p className="mt-4 text-[32px] font-bold tracking-[-0.02em] text-[var(--glide-text)]">
                ${parsed.toFixed(2)}{" "}
                <span className="text-[var(--glide-muted)]">→</span> {toAmount}
              </p>
              <p className="glide-label-mono mt-2 text-[11px] font-semibold text-[var(--glide-muted)]">
                USDC to EURC
              </p>
              <GlideButton
                onClick={() => router.push("/activity")}
                className="mt-auto mb-8 max-w-sm"
              >
                View activity
              </GlideButton>
            </div>
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="slide-up-bouncy flex flex-col pb-8"
            >
              <KitSetupBanner mode="swap" />
              <div className="relative flex flex-col px-5">
                {/* FROM card */}
                <div
                  className="rounded-3xl border p-5"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="USDC" size={36} />
                      <span className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
                        USDC
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={useMax}
                      className="glide-tap glide-label-mono rounded-full border px-3 py-1.5 text-[11px] font-bold"
                      style={{
                        background: "var(--glide-surface-container)",
                        borderColor: "var(--glide-border)",
                        color: "var(--glide-text)",
                      }}
                    >
                      Use max
                    </button>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[28px] font-bold text-[var(--glide-muted)]">
                      $
                    </span>
                    <input
                      id="swap-from"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="min-w-0 flex-1 bg-transparent text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums focus:outline-none"
                      style={{ color: "var(--glide-text)" }}
                    />
                  </div>
                  <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
                    Balance ${balance.toFixed(2)}
                  </p>
                </div>

                {/* Swap circle — sits between the two cards, overlapping */}
                <div className="relative z-10 -my-3 flex justify-center">
                  <span
                    className="glide-tap flex h-12 w-12 items-center justify-center rounded-full ring-4"
                    style={{
                      background: "var(--glide-accent)",
                      color: "var(--glide-bg)",
                      // ring matches page bg so the circle "cuts out" between cards
                      ["--tw-ring-color" as string]: "var(--glide-bg)",
                    }}
                  >
                    <ArrowDownUp className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                </div>

                {/* TO card */}
                <div
                  className="rounded-3xl border p-5"
                  style={{
                    background: "var(--glide-surface-elevated)",
                    borderColor: "var(--glide-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TokenIcon symbol="EURC" size={36} />
                      <span className="text-[16px] font-bold tracking-tight text-[var(--glide-text)]">
                        EURC
                      </span>
                    </div>
                    <span className="glide-label-mono text-[11px] font-bold text-[var(--glide-muted)]">
                      Receive
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-[28px] font-bold text-[var(--glide-muted)]">
                      €
                    </span>
                    <p
                      className="min-w-0 flex-1 text-[44px] font-bold leading-none tracking-[-0.03em] tabular-nums"
                      style={{
                        color: toAmount
                          ? "var(--glide-text)"
                          : "var(--glide-muted)",
                      }}
                    >
                      {toAmount || "0.00"}
                    </p>
                  </div>
                  <p className="glide-label-mono mt-3 text-[11px] font-semibold text-[var(--glide-muted)]">
                    Estimated
                  </p>
                </div>

                {/* Rate pill */}
                <div
                  className="mt-5 flex items-center justify-between rounded-full border px-4 py-3"
                  style={{
                    background: "var(--glide-surface-container)",
                    borderColor: "var(--glide-border)",
                  }}
                >
                  <span className="glide-label-mono text-[11px] font-semibold text-[var(--glide-muted)]">
                    Rate
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums text-[var(--glide-text)]"
                    style={{
                      fontFamily:
                        "var(--font-geist-mono), ui-monospace, monospace",
                    }}
                  >
                    1 USDC = {RATE} EURC
                  </span>
                </div>

                {overBalance ? (
                  <p className="mt-3 text-sm text-red-400">
                    Amount exceeds your balance
                  </p>
                ) : null}
                {error ? (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                ) : null}

                <GlidePillButton
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-8 w-full"
                >
                  {submitting ? "Processing" : "Confirm swap"}
                </GlidePillButton>
              </div>
            </form>
          )}
        </FlowStepMotion>
      </div>
    </FlowPage>
  );
}
